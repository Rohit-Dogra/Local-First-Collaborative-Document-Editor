import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createDocumentSchema } from "@/lib/validation/schemas";

export async function GET() {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: authResult.userId },
        { members: { some: { userId: authResult.userId } } },
      ],
    },
    include: {
      members: { where: { userId: authResult.userId } },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content,
    updatedAt: doc.updatedAt.toISOString(),
    role: doc.ownerId === authResult.userId ? "OWNER" : doc.members[0]?.role ?? "VIEWER",
    ownerName: doc.owner.name ?? doc.owner.email,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const authResult = await requireUser();
  if ("error" in authResult) return authResult.error;

  const body = await req.json();
  const parsed = createDocumentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title,
      ownerId: authResult.userId,
    },
  });

  return NextResponse.json({
    id: document.id,
    title: document.title,
    content: document.content,
    role: "OWNER",
    updatedAt: document.updatedAt.toISOString(),
  });
}
