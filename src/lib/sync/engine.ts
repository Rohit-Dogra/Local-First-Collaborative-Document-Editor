import { getClientId, getLocalDb } from "@/lib/local-db";
import {
  applyOperations,
  diffToOperations,
  maxLamport,
  mergeOperationLists,
} from "@/lib/sync/merge";
import type {
  DocumentOperation,
  LocalDocument,
  SyncPullResponse,
  SyncPushResponse,
} from "@/lib/sync/types";

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastError: string | null;
  lastSyncedAt: string | null;
}

/**
 * Background sync engine:
 * - Saves edits to IndexedDB immediately
 * - Queues operations for server push
 * - Pulls remote changes when online
 * - Never overwrites local work — merges deterministically
 */
export class SyncEngine {
  private listeners = new Set<SyncListener>();
  private sequence = 0;
  private syncing = false;
  private status: SyncStatus = {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    syncing: false,
    pendingCount: 0,
    lastError: null,
    lastSyncedAt: null,
  };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.status.online = true;
        this.emit();
        void this.syncAll();
      });
      window.addEventListener("offline", () => {
        this.status.online = false;
        this.emit();
      });
    }
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    for (const listener of this.listeners) listener({ ...this.status });
  }

  /** Load document from local DB (instant — no network) */
  async getDocument(documentId: string): Promise<LocalDocument | undefined> {
    return getLocalDb().documents.get(documentId);
  }

  /** Save document metadata locally */
  async saveDocument(doc: LocalDocument) {
    await getLocalDb().documents.put(doc);
  }

  /** Main edit path: diff → local ops → rebuild content → queue sync */
  async applyLocalEdit(documentId: string, newContent: string, newTitle?: string) {
    const db = getLocalDb();
    const doc = await db.documents.get(documentId);
    if (!doc) throw new Error("Document not found locally");

    const clientId = getClientId();
    const lamport = doc.lamport + 1;
    this.sequence += 1;

    const ops = diffToOperations(doc.content, newContent, {
      documentId,
      clientId,
      lamport,
      sequence: this.sequence,
    });

    if (ops.length === 0 && newTitle === undefined) return doc;

    for (const op of ops) {
      await db.operations.put(op);
      await db.syncQueue.add({ operation: op, status: "pending", retries: 0 });
    }

    const allOps = await db.operations.where("documentId").equals(documentId).toArray();
    const content = applyOperations("", mergeOperationLists(allOps));

    const updated: LocalDocument = {
      ...doc,
      content,
      title: newTitle ?? doc.title,
      lamport: Math.max(lamport, maxLamport(allOps)),
      updatedAt: new Date().toISOString(),
    };

    await db.documents.put(updated);
    await this.refreshPendingCount();

    if (this.status.online) {
      void this.syncDocument(documentId);
    }

    return updated;
  }

  async getOperations(documentId: string) {
    return getLocalDb().operations.where("documentId").equals(documentId).toArray();
  }

  private async refreshPendingCount() {
    const count = await getLocalDb()
      .syncQueue.where("status")
      .equals("pending")
      .count();
    this.status.pendingCount = count;
    this.emit();
  }

  async syncAll() {
    const docs = await getLocalDb().documents.toArray();
    for (const doc of docs) {
      await this.syncDocument(doc.id);
    }
  }

  async syncDocument(documentId: string) {
    if (this.syncing || !this.status.online) return;
    this.syncing = true;
    this.status.syncing = true;
    this.emit();

    try {
      await this.pushPending(documentId);
      await this.pullRemote(documentId);
      this.status.lastError = null;
      this.status.lastSyncedAt = new Date().toISOString();
    } catch (err) {
      this.status.lastError = err instanceof Error ? err.message : "Sync failed";
    } finally {
      this.syncing = false;
      this.status.syncing = false;
      await this.refreshPendingCount();
      this.emit();
    }
  }

  private async pushPending(documentId: string) {
    const db = getLocalDb();
    const pending = await db.syncQueue
      .where("status")
      .equals("pending")
      .filter((item) => item.operation.documentId === documentId)
      .toArray();

    if (pending.length === 0) return;

    const operations = pending.map((p) => p.operation);

    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, operations }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Push failed");
    }

    const data = (await res.json()) as SyncPushResponse;

    for (const item of pending) {
      if (data.accepted.includes(item.operation.id)) {
        await db.syncQueue.delete(item.id!);
      }
    }

    const doc = await db.documents.get(documentId);
    if (doc) {
      await db.documents.put({
        ...doc,
        content: data.mergedContent,
        lastSyncedLamport: doc.lamport,
      });
    }
  }

  private async pullRemote(documentId: string) {
    const db = getLocalDb();
    const doc = await db.documents.get(documentId);
    if (!doc) return;

    const res = await fetch(
      `/api/sync/pull?documentId=${documentId}&sinceLamport=${doc.lastSyncedLamport}`
    );

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Pull failed");
    }

    const data = (await res.json()) as SyncPullResponse;

    for (const op of data.operations) {
      await db.operations.put(op);
    }

    const allOps = await db.operations.where("documentId").equals(documentId).toArray();
    let content = applyOperations("", mergeOperationLists(allOps));
    if (!content && data.mergedContent) {
      content = data.mergedContent;
    }

    await db.documents.put({
      ...doc,
      content,
      lamport: Math.max(doc.lamport, data.serverLamport),
      lastSyncedLamport: data.serverLamport,
      updatedAt: new Date().toISOString(),
    });
  }
}

let engine: SyncEngine | null = null;

export function getSyncEngine(): SyncEngine {
  if (!engine) engine = new SyncEngine();
  return engine;
}
