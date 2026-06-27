"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { X, RotateCcw, History } from "lucide-react";

interface Version {
  id: string;
  label?: string;
  title: string;
  content: string;
  createdAt: string;
  author?: string;
}

interface VersionPanelProps {
  documentId: string;
  canRestore: boolean;
  onRestore: (content: string, title: string) => void;
  onClose: () => void;
}

export function VersionPanel({
  documentId,
  canRestore,
  onRestore,
  onClose,
}: VersionPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/versions?documentId=${documentId}`);
      if (res.ok) {
        setVersions(await res.json());
      }
      setLoading(false);
    }
    void load();
  }, [documentId]);

  const handleRestore = async (version: Version) => {
    if (!canRestore) return;
    setRestoring(version.id);

    const res = await fetch(`/api/versions/${version.id}/restore`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      onRestore(data.content, data.title ?? version.title);
    }
    setRestoring(null);
  };

  return (
    <aside
      className="flex w-80 flex-col border-l border-slate-200/80 bg-white/95 backdrop-blur-sm"
      aria-label="Version history"
    >
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3.5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <History className="h-4 w-4 text-brand-600" aria-hidden />
          Version History
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <p className="py-4 text-center text-sm text-slate-500">Loading snapshots…</p>
        )}
        {!loading && versions.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No snapshots yet.</p>
            <p className="mt-1 text-xs text-slate-400">Click Snapshot to save one.</p>
          </div>
        )}

        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.id} className="surface-card p-3.5">
              <p className="font-medium text-slate-900">{v.label ?? "Snapshot"}</p>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(v.createdAt)}</p>
              {v.author && <p className="text-xs text-slate-400">by {v.author}</p>}
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {v.content || "(empty)"}
              </p>

              {canRestore && (
                <button
                  type="button"
                  disabled={restoring === v.id}
                  onClick={() => void handleRestore(v)}
                  className="btn-ghost btn-sm mt-2 !px-0 text-brand-600 hover:!bg-transparent hover:text-brand-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {restoring === v.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
