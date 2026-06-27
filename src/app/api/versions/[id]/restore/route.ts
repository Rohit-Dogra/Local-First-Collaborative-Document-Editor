import { NextResponse } from "next/server";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";
import { diffToOperations } from "@/lib/sync/merge";
import { OperationType } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Restore a version safely:
 * - Does NOT delete operation history (other collaborators keep their timeline)
 * - Creates new operations that bring the doc to the snapshot state
 * - Other users see the restore as normal edits merged deterministically
 */
export async function POST(_req: Request, context: RouteContext) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { id: versionId } = await context.params;

  const version = await prisma.documentVersion.findUnique({
    where: { id: versionId },
    include: { document: true },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const access = await getDocumentAccess(version.documentId, authResult.userId);

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: "Viewers cannot restore versions" }, { status: 403 });
  }

  const currentContent = access.document.content;
  const targetContent = version.content;

  if (currentContent === targetContent) {
    return NextResponse.json({ message: "Already at this version", content: currentContent });
  }

  // Server-side restore: create ops from diff and store them
  const clientId = `restore-${authResult.userId}`;
  const lamport =
    (await prisma.operation.aggregate({
      where: { documentId: version.documentId },
      _max: { lamport: true },
    }))._max.lamport ?? 0;

  const ops = diffToOperations(currentContent, targetContent, {
    documentId: version.documentId,
    clientId,
    lamport: lamport + 1,
    sequence: Date.now(),
  });

  for (const op of ops) {
    await prisma.operation.create({
      data: {
        id: op.id,
        documentId: version.documentId,
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
  }

  await prisma.document.update({
    where: { id: version.documentId },
    data: { content: targetContent, title: version.title },
  });

  return NextResponse.json({
    message: "Version restored",
    content: targetContent,
    title: version.title,
    operationsCreated: ops.length,
  });
}
