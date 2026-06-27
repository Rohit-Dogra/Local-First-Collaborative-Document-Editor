import { NextRequest, NextResponse } from "next/server";
import { DocumentRole, OperationType } from "@prisma/client";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";
import {
  applyOperations,
  mergeOperationLists,
} from "@/lib/sync/merge";
import type { DocumentOperation } from "@/lib/sync/types";
import {
  assertPayloadSize,
  syncPushSchema,
  SYNC_LIMITS,
} from "@/lib/validation/schemas";

function toClientOp(op: {
  id: string;
  documentId: string;
  type: OperationType;
  position: number;
  text: string;
  length: number;
  lamport: number;
  clientId: string;
  sequence: number;
  createdAt: Date;
}): DocumentOperation {
  return {
    ...op,
    type: op.type as DocumentOperation["type"],
    createdAt: op.createdAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    assertPayloadSize(req.headers.get("content-length") ? Number(req.headers.get("content-length")) : null);

    const authResult = await requireUser();
    if ("error" in authResult) return authResult.error;

    const body = await req.json();
    const parsed = syncPushSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { documentId, operations } = parsed.data;
    const access = await getDocumentAccess(documentId, authResult.userId);

    if (!access) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!canEdit(access.role)) {
      return NextResponse.json(
        { error: "Viewers cannot push changes" },
        { status: 403 }
      );
    }

    const existing = await prisma.operation.findMany({
      where: { documentId },
    });

    const accepted: string[] = [];
    const rejected: { id: string; reason: string }[] = [];

    for (const op of operations) {
      const duplicate = existing.find((e) => e.id === op.id);
      if (duplicate) {
        accepted.push(op.id);
        continue;
      }

      if (op.text.length > SYNC_LIMITS.maxOperationTextLength) {
        rejected.push({ id: op.id, reason: "Text too long" });
        continue;
      }

      await prisma.operation.create({
        data: {
          id: op.id,
          documentId,
          userId: authResult.userId,
          type: op.type as OperationType,
          position: op.position,
          text: op.text,
          length: op.length,
          lamport: op.lamport,
          clientId: op.clientId,
          sequence: op.sequence,
          createdAt: new Date(op.createdAt),
        },
      });

      accepted.push(op.id);
    }

    const allOps = await prisma.operation.findMany({ where: { documentId } });
    const clientOps = allOps.map(toClientOp);
    const mergedContent = applyOperations("", mergeOperationLists(clientOps));

    if (mergedContent.length > SYNC_LIMITS.maxDocumentContentLength) {
      return NextResponse.json({ error: "Document exceeds size limit" }, { status: 413 });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { content: mergedContent },
    });

    return NextResponse.json({
      accepted,
      rejected,
      mergedContent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    const status = message === "Payload too large" ? 413 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
