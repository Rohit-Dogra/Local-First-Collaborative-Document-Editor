import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const demo = await prisma.user.upsert({
    where: { email: "demo@collabdocs.app" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@collabdocs.app",
      passwordHash,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor@collabdocs.app" },
    update: {},
    create: {
      name: "Editor User",
      email: "editor@collabdocs.app",
      passwordHash,
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@collabdocs.app" },
    update: {},
    create: {
      name: "Viewer User",
      email: "viewer@collabdocs.app",
      passwordHash,
    },
  });

  const doc = await prisma.document.upsert({
    where: { id: "seed-demo-doc" },
    update: {},
    create: {
      id: "seed-demo-doc",
      title: "Welcome to CollabDocs",
      content:
        "This is a local-first collaborative editor.\n\nTry editing offline (turn off WiFi), then reconnect to sync.\n\nRoles:\n- demo@collabdocs.app (Owner)\n- editor@collabdocs.app (Editor)\n- viewer@collabdocs.app (Viewer — read only)",
      ownerId: demo.id,
    },
  });

  await prisma.documentMember.upsert({
    where: { documentId_userId: { documentId: doc.id, userId: editor.id } },
    update: {},
    create: { documentId: doc.id, userId: editor.id, role: "EDITOR" },
  });

  await prisma.documentMember.upsert({
    where: { documentId_userId: { documentId: doc.id, userId: viewer.id } },
    update: {},
    create: { documentId: doc.id, userId: viewer.id, role: "VIEWER" },
  });

  // Bootstrap op so sync/merge can rebuild content from operation log
  await prisma.operation.upsert({
    where: { documentId_id: { documentId: doc.id, id: "seed-demo-doc-init" } },
    update: {},
    create: {
      id: "seed-demo-doc-init",
      documentId: doc.id,
      userId: demo.id,
      type: "INSERT",
      position: 0,
      text: doc.content,
      length: 0,
      lamport: 1,
      clientId: "seed-bootstrap",
      sequence: 1,
    },
  });

  console.log("Seed complete:");
  console.log("  demo@collabdocs.app / password123 (Owner)");
  console.log("  editor@collabdocs.app / password123 (Editor)");
  console.log("  viewer@collabdocs.app / password123 (Viewer)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
