/**
 * Sync types shared between client (IndexedDB) and server (PostgreSQL).
 * Keeping these simple makes the merge logic easy to follow.
 */

export type OperationType = "INSERT" | "DELETE";

export interface DocumentOperation {
  /** Globally unique operation id (UUID) */
  id: string;
  documentId: string;
  type: OperationType;
  /** Character position in the document */
  position: number;
  /** Text inserted (INSERT) or empty for DELETE */
  text: string;
  /** Number of characters deleted (DELETE only) */
  length: number;
  /** Lamport clock — bumped on every local edit for deterministic ordering */
  lamport: number;
  /** Stable client id stored in localStorage */
  clientId: string;
  /** Per-client sequence number */
  sequence: number;
  createdAt: string;
}

export interface LocalDocument {
  id: string;
  title: string;
  content: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  lamport: number;
  lastSyncedLamport: number;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;
  operation: DocumentOperation;
  status: "pending" | "syncing" | "failed";
  retries: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  title: string;
  content: string;
  label?: string;
  createdAt: string;
}

export interface SyncPullResponse {
  operations: DocumentOperation[];
  serverLamport: number;
  /** Full merged document text on the server (ops + stored content fallback) */
  mergedContent: string;
}

export interface SyncPushResponse {
  accepted: string[];
  rejected: { id: string; reason: string }[];
  mergedContent: string;
}
