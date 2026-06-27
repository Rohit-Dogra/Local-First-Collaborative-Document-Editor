import { NextRequest, NextResponse } from "next/server";
import { OperationType } from "@prisma/client";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { applyOperations, mergeOperationLists } from "@/lib/sync/merge";
import type { DocumentOperation } from "@/lib/sync/types";
import { syncPullSchema } from "@/lib/validation/schemas";

export async function GET(req: NextRequest) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = syncPullSchema.safeParse({
    documentId: params.documentId,
    sinceLamport: params.sinceLamport ? Number(params.sinceLamport) : 0,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const { documentId, sinceLamport } = parsed.data;
  const access = await getDocumentAccess(documentId, authResult.userId);

  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const operations = await prisma.operation.findMany({
    where: { documentId, lamport: { gt: sinceLamport } },
    orderBy: [{ lamport: "asc" }, { clientId: "asc" }, { sequence: "asc" }],
    take: 500,
  });

  const allOps = await prisma.operation.findMany({
    where: { documentId },
    orderBy: [{ lamport: "asc" }, { clientId: "asc" }, { sequence: "asc" }],
  });

  const allClientOps: DocumentOperation[] = allOps.map((op) => ({
    id: op.id,
    documentId: op.documentId,
    type: op.type as DocumentOperation["type"],
    position: op.position,
    text: op.text,
    length: op.length,
    lamport: op.lamport,
    clientId: op.clientId,
    sequence: op.sequence,
    createdAt: op.createdAt.toISOString(),
  }));

  let mergedContent = applyOperations("", mergeOperationLists(allClientOps));
  if (!mergedContent) {
    mergedContent = access.document.content;
  }

  const clientOps: DocumentOperation[] = operations.map((op) => ({
    id: op.id,
    documentId: op.documentId,
    type: op.type as DocumentOperation["type"],
    position: op.position,
    text: op.text,
    length: op.length,
    lamport: op.lamport,
    clientId: op.clientId,
    sequence: op.sequence,
    createdAt: op.createdAt.toISOString(),
  }));

  const serverLamport = allOps.reduce((max, op) => Math.max(max, op.lamport), sinceLamport);

  return NextResponse.json({ operations: clientOps, serverLamport, mergedContent });
}
