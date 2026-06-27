import { NextResponse } from "next/server";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canEdit } from "@/lib/permissions";
import { createVersionSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 400 });
  }

  const access = await getDocumentAccess(documentId, authResult.userId);
  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json(
    versions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      title: v.title,
      content: v.content,
      label: v.label,
      createdAt: v.createdAt.toISOString(),
      author: v.user.name ?? v.user.email,
    }))
  );
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const body = await req.json();
  const parsed = createVersionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const access = await getDocumentAccess(parsed.data.documentId, authResult.userId);

  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!canEdit(access.role)) {
    return NextResponse.json({ error: "Viewers cannot create snapshots" }, { status: 403 });
  }

  const version = await prisma.documentVersion.create({
    data: {
      documentId: parsed.data.documentId,
      userId: authResult.userId,
      title: access.document.title,
      content: access.document.content,
      label: parsed.data.label,
    },
  });

  return NextResponse.json({
    id: version.id,
    documentId: version.documentId,
    title: version.title,
    content: version.content,
    label: version.label,
    createdAt: version.createdAt.toISOString(),
  });
}
