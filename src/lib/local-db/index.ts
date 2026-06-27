import Dexie, { type Table } from "dexie";
import type {
  DocumentOperation,
  DocumentVersion,
  LocalDocument,
  SyncQueueItem,
} from "@/lib/sync/types";

/**
 * IndexedDB is the primary source of truth on the client.
 * The UI reads/writes here first — network is never on the critical path.
 */
export class LocalDatabase extends Dexie {
  documents!: Table<LocalDocument, string>;
  operations!: Table<DocumentOperation, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  versions!: Table<DocumentVersion, string>;

  constructor() {
    super("CollabDocEditor");

    this.version(1).stores({
      documents: "id, updatedAt",
      operations: "id, documentId, lamport",
      syncQueue: "++id, status, operation.documentId",
      versions: "id, documentId, createdAt",
    });
  }
}

let db: LocalDatabase | null = null;

export function getLocalDb(): LocalDatabase {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!db) db = new LocalDatabase();
  return db;
}

export function getClientId(): string {
  if (typeof window === "undefined") return "server";

  const key = "collab-client-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
