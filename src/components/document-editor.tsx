"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSyncEngine } from "@/lib/sync/engine";
import { getLocalDb } from "@/lib/local-db";
import { canEdit } from "@/lib/permissions";
import { SyncStatusBar } from "@/components/sync-status-bar";
import { VersionPanel } from "@/components/version-panel";
import { AiPanel } from "@/components/ai-panel";
import { cn, formatDate } from "@/lib/utils";
import type { LocalDocument } from "@/lib/sync/types";
import { Save, History, Sparkles } from "lucide-react";

interface DocumentEditorProps {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "badge",
        role === "OWNER" && "badge-owner",
        role === "EDITOR" && "badge-editor",
        role === "VIEWER" && "badge-viewer"
      )}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

export function DocumentEditor({
  documentId,
  initialTitle,
  initialContent,
  role,
}: DocumentEditorProps) {
  const [doc, setDoc] = useState<LocalDocument | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [showVersions, setShowVersions] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editable = canEdit(role);

  useEffect(() => {
    async function init() {
      const engine = getSyncEngine();
      let local = await engine.getDocument(documentId);

      if (!local) {
        local = {
          id: documentId,
          title: initialTitle,
          content: initialContent,
          role,
          lamport: 0,
          lastSyncedLamport: 0,
          updatedAt: new Date().toISOString(),
        };
        await engine.saveDocument(local);
      } else if (!local.content && initialContent) {
        local = { ...local, content: initialContent };
        await engine.saveDocument(local);
      }

      setDoc(local);
      setTitle(local.title);
      setContent(local.content);

      await engine.syncDocument(documentId);
      const synced = await engine.getDocument(documentId);
      if (synced) {
        setDoc(synced);
        setTitle(synced.title);
        setContent(synced.content);
      }
    }

    void init();
  }, [documentId, initialTitle, initialContent, role]);

  const persistEdit = useCallback(
    async (newContent: string, newTitle?: string) => {
      if (!editable) return;
      setSaving(true);
      try {
        const updated = await getSyncEngine().applyLocalEdit(
          documentId,
          newContent,
          newTitle
        );
        setDoc(updated);
      } finally {
        setSaving(false);
      }
    },
    [documentId, editable]
  );

  const handleContentChange = (value: string) => {
    setContent(value);
    if (!editable) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persistEdit(value);
    }, 400);
  };

  const handleTitleBlur = () => {
    if (!editable || title === doc?.title) return;
    void persistEdit(content, title);
  };

  const handleSnapshot = async () => {
    const res = await fetch("/api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId,
        label: `Snapshot ${formatDate(new Date())}`,
      }),
    });

    if (res.ok) {
      const version = await res.json();
      await getLocalDb().versions.put(version);
      setShowVersions(true);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              disabled={!editable}
              aria-label="Document title"
              className="min-w-0 flex-1 truncate rounded-lg border-none bg-transparent px-1 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <RoleBadge role={role} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SyncStatusBar />
            {editable && (
              <>
                <button
                  type="button"
                  onClick={() => void handleSnapshot()}
                  className="btn-secondary btn-sm"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => setShowAi((v) => !v)}
                  className={cn(
                    "btn-secondary btn-sm",
                    showAi && "border-violet-300 bg-violet-50 text-violet-700"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  AI
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowVersions((v) => !v)}
              className={cn(
                "btn-secondary btn-sm",
                showVersions && "border-brand-300 bg-brand-50 text-brand-700"
              )}
            >
              <History className="h-3.5 w-3.5" aria-hidden />
              History
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden p-4 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              readOnly={!editable}
              aria-label="Document content"
              placeholder={editable ? "Start writing your document…" : "Read-only document"}
              className={cn(
                "flex-1 resize-none border-none bg-transparent p-6 text-[15px] leading-7 text-slate-800 outline-none sm:p-8",
                !editable && "bg-slate-50/50 text-slate-600"
              )}
            />
            <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
              <span>{saving ? "Saving locally…" : "All changes saved locally"}</span>
              <span>{doc ? `Updated ${formatDate(doc.updatedAt)}` : "—"}</span>
            </footer>
          </div>
        </main>

        {showVersions && (
          <VersionPanel
            documentId={documentId}
            canRestore={editable}
            onRestore={(restoredContent, restoredTitle) => {
              setContent(restoredContent);
              setTitle(restoredTitle);
              void getSyncEngine().applyLocalEdit(documentId, restoredContent, restoredTitle);
            }}
            onClose={() => setShowVersions(false)}
          />
        )}

        {showAi && editable && (
          <AiPanel
            documentId={documentId}
            content={content}
            onApply={(text) => {
              setContent(text);
              void persistEdit(text);
            }}
            onClose={() => setShowAi(false)}
          />
        )}
      </div>
    </div>
  );
}
