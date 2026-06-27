import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId: session.user.id };
}

export async function getDocumentAccess(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      members: { where: { userId } },
    },
  });

  if (!document) return null;

  if (document.ownerId === userId) {
    return { document, role: DocumentRole.OWNER };
  }

  const membership = document.members[0];
  if (!membership) return null;

  return { document, role: membership.role };
}
