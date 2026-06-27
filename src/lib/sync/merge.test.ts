import { randomUUID } from "crypto";
import { describe, expect, it } from "vitest";
import {
  applyOperations,
  diffToOperations,
  mergeOperationLists,
  sortOperations,
} from "@/lib/sync/merge";
import type { DocumentOperation } from "@/lib/sync/types";

const base = (overrides: Partial<DocumentOperation>): DocumentOperation => ({
  id: randomUUID(),
  documentId: "doc1",
  type: "INSERT",
  position: 0,
  text: "a",
  length: 0,
  lamport: 1,
  clientId: "client-a",
  sequence: 1,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("merge engine", () => {
  it("sorts deterministically by lamport, clientId, sequence", () => {
    const ops = [
      base({ id: "1", lamport: 2, clientId: "b", sequence: 1, text: "B" }),
      base({ id: "2", lamport: 1, clientId: "z", sequence: 1, text: "A" }),
      base({ id: "3", lamport: 2, clientId: "a", sequence: 1, text: "C" }),
    ];

    const sorted = sortOperations(ops);
    expect(sorted.map((o) => o.id)).toEqual(["2", "3", "1"]);
  });

  it("merges concurrent inserts without data loss", () => {
    const opA = base({
      id: "a",
      lamport: 1,
      clientId: "client-a",
      position: 0,
      text: "Hello",
    });
    const opB = base({
      id: "b",
      lamport: 1,
      clientId: "client-b",
      position: 0,
      text: "Hi",
    });

    const merged = mergeOperationLists([opA], [opB]);
    const result = applyOperations("", merged);

    // client-a applied first → "Hello", then "Hi" shifts to end
    expect(result).toBe("HelloHi");
  });

  it("applies delete then insert from diff", () => {
    const ops = diffToOperations("hello world", "hello there", {
      documentId: "doc1",
      clientId: "c1",
      lamport: 5,
      sequence: 1,
    });

    expect(ops).toHaveLength(2);
    const result = applyOperations("hello world", ops);
    expect(result).toBe("hello there");
  });

  it("deduplicates identical operation ids", () => {
    const op = base({ id: "same-id", text: "once" });
    const merged = mergeOperationLists([op, { ...op }]);
    expect(merged).toHaveLength(1);
  });
});
