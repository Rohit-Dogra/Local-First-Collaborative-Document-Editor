import { NextResponse } from "next/server";
import { requireUser, getDocumentAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { canManageMembers } from "@/lib/permissions";
import { inviteMemberSchema, updateDocumentSchema } from "@/lib/validation/schemas";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const access = await getDocumentAccess(id, authResult.userId);

  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const members = await prisma.documentMember.findMany({
    where: { documentId: id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    id: access.document.id,
    title: access.document.title,
    content: access.document.content,
    role: access.role,
    updatedAt: access.document.updatedAt.toISOString(),
    members,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const access = await getDocumentAccess(id, authResult.userId);

  if (!access) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function POST(req: Request, context: RouteContext) {
  /** Invite a member to the document */
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const access = await getDocumentAccess(id, authResult.userId);

  if (!access || !canManageMembers(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = inviteMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.id === access.document.ownerId) {
    return NextResponse.json({ error: "Owner is already a member" }, { status: 400 });
  }

  const member = await prisma.documentMember.upsert({
    where: { documentId_userId: { documentId: id, userId: user.id } },
    create: { documentId: id, userId: user.id, role: parsed.data.role },
    update: { role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member);
}
