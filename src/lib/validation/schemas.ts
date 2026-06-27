import { z } from "zod";

/** Limits to prevent OOM / abuse from malformed sync payloads */
export const SYNC_LIMITS = {
  maxOperationsPerPush: 100,
  maxOperationTextLength: 10_000,
  maxDocumentContentLength: 500_000,
  maxTitleLength: 200,
  maxPayloadBytes: 512_000,
} as const;

const operationSchema = z.object({
  id: z.string().min(1).max(64),
  documentId: z.string().min(1).max(64),
  type: z.enum(["INSERT", "DELETE"]),
  position: z.number().int().min(0).max(SYNC_LIMITS.maxDocumentContentLength),
  text: z.string().max(SYNC_LIMITS.maxOperationTextLength),
  length: z.number().int().min(0).max(SYNC_LIMITS.maxOperationTextLength),
  lamport: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  clientId: z.string().min(1).max(64),
  sequence: z.number().int().min(0),
  createdAt: z.string().datetime(),
});

export const syncPushSchema = z.object({
  documentId: z.string().min(1).max(64),
  operations: z.array(operationSchema).min(1).max(SYNC_LIMITS.maxOperationsPerPush),
});

export const syncPullSchema = z.object({
  documentId: z.string().min(1).max(64),
  sinceLamport: z.number().int().min(0).default(0),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(SYNC_LIMITS.maxTitleLength),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(SYNC_LIMITS.maxTitleLength).optional(),
});

export const createVersionSchema = z.object({
  documentId: z.string().min(1).max(64),
  label: z.string().trim().max(100).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["EDITOR", "VIEWER"]),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const aiAssistSchema = z.object({
  documentId: z.string().min(1).max(64),
  action: z.enum(["improve", "summarize", "grammar", "continue"]),
  text: z.string().max(20_000),
});

export type SyncPushInput = z.infer<typeof syncPushSchema>;
export type SyncPullInput = z.infer<typeof syncPullSchema>;

/** Reject oversized raw request bodies before JSON parse blows up memory */
export function assertPayloadSize(contentLength: number | null) {
  if (contentLength && contentLength > SYNC_LIMITS.maxPayloadBytes) {
    throw new Error("Payload too large");
  }
}
