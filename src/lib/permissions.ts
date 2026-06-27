import { DocumentRole } from "@prisma/client";

/** Roles that can push edits to the sync server */
export function canEdit(role: DocumentRole | null | undefined): boolean {
  return role === DocumentRole.OWNER || role === DocumentRole.EDITOR;
}

export function canManageMembers(role: DocumentRole | null | undefined): boolean {
  return role === DocumentRole.OWNER;
}

export function roleLabel(role: DocumentRole): string {
  switch (role) {
    case DocumentRole.OWNER:
      return "Owner";
    case DocumentRole.EDITOR:
      return "Editor";
    case DocumentRole.VIEWER:
      return "Viewer";
  }
}
