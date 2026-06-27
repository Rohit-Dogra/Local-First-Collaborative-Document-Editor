import { v4 as randomUUID } from "uuid";
import type { DocumentOperation } from "./types";

/**
 * Deterministic conflict resolution:
 * 1. Deduplicate operations by id
 * 2. Sort by lamport clock, then clientId, then sequence
 * 3. Apply in order to rebuild document text
 *
 * Same inputs always produce the same output — important for offline sync.
 */

export function sortOperations(ops: DocumentOperation[]): DocumentOperation[] {
  return [...ops].sort((a, b) => {
    if (a.lamport !== b.lamport) return a.lamport - b.lamport;
    if (a.clientId !== b.clientId) return a.clientId.localeCompare(b.clientId);
    return a.sequence - b.sequence;
  });
}

export function dedupeOperations(ops: DocumentOperation[]): DocumentOperation[] {
  const seen = new Map<string, DocumentOperation>();
  for (const op of ops) {
    seen.set(op.id, op);
  }
  return Array.from(seen.values());
}

export function mergeOperationLists(
  ...lists: DocumentOperation[][]
): DocumentOperation[] {
  const merged = dedupeOperations(lists.flat());
  return sortOperations(merged);
}

/** Shift position when another op was applied before this one */
function transformPosition(
  pos: number,
  prior: DocumentOperation
): number {
  if (prior.type === "INSERT") {
    if (prior.position <= pos) return pos + prior.text.length;
    return pos;
  }
  // DELETE
  const end = prior.position + prior.length;
  if (prior.position >= pos) return pos;
  if (end <= pos) return pos - prior.length;
  return prior.position;
}

/** Apply one op, adjusting its position based on ops already applied */
function applySingleOp(content: string, op: DocumentOperation, priorOps: DocumentOperation[]): string {
  let position = op.position;
  for (const prior of priorOps) {
    position = transformPosition(position, prior);
  }

  if (op.type === "INSERT") {
    const safePos = Math.max(0, Math.min(position, content.length));
    return content.slice(0, safePos) + op.text + content.slice(safePos);
  }

  const safePos = Math.max(0, Math.min(position, content.length));
  const deleteLen = Math.min(op.length, content.length - safePos);
  return content.slice(0, safePos) + content.slice(safePos + deleteLen);
}

export function applyOperations(
  baseContent: string,
  ops: DocumentOperation[]
): string {
  const sorted = sortOperations(dedupeOperations(ops));
  let content = baseContent;
  const applied: DocumentOperation[] = [];

  for (const op of sorted) {
    content = applySingleOp(content, op, applied);
    applied.push(op);
  }

  return content;
}

/** Compare old and new text and produce minimal insert/delete ops */
export function diffToOperations(
  oldText: string,
  newText: string,
  meta: Pick<DocumentOperation, "documentId" | "clientId" | "lamport" | "sequence">
): DocumentOperation[] {
  const ops: DocumentOperation[] = [];
  let prefix = 0;
  while (
    prefix < oldText.length &&
    prefix < newText.length &&
    oldText[prefix] === newText[prefix]
  ) {
    prefix++;
  }

  let oldSuffix = oldText.length;
  let newSuffix = newText.length;
  while (
    oldSuffix > prefix &&
    newSuffix > prefix &&
    oldText[oldSuffix - 1] === newText[newSuffix - 1]
  ) {
    oldSuffix--;
    newSuffix--;
  }

  const deleted = oldText.slice(prefix, oldSuffix);
  const inserted = newText.slice(prefix, newSuffix);

  const baseId = randomUUID();

  if (deleted.length > 0) {
    ops.push({
      id: `${baseId}-del`,
      documentId: meta.documentId,
      type: "DELETE",
      position: prefix,
      text: "",
      length: deleted.length,
      lamport: meta.lamport,
      clientId: meta.clientId,
      sequence: meta.sequence,
      createdAt: new Date().toISOString(),
    });
  }

  if (inserted.length > 0) {
    ops.push({
      id: `${baseId}-ins`,
      documentId: meta.documentId,
      type: "INSERT",
      position: prefix,
      text: inserted,
      length: 0,
      lamport: meta.lamport,
      clientId: meta.clientId,
      sequence: meta.sequence,
      createdAt: new Date().toISOString(),
    });
  }

  return ops;
}

export function maxLamport(ops: DocumentOperation[]): number {
  return ops.reduce((max, op) => Math.max(max, op.lamport), 0);
}
