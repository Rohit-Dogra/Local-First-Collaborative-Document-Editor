"use client";

import { useState } from "react";
import { X, Sparkles, Wand2 } from "lucide-react";

type AiAction = "improve" | "summarize" | "grammar" | "continue";

interface AiPanelProps {
  documentId: string;
  content: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

const ACTIONS: { id: AiAction; label: string; desc: string }[] = [
  { id: "improve", label: "Improve writing", desc: "Polish tone and clarity" },
  { id: "summarize", label: "Summarize", desc: "Get a concise summary" },
  { id: "grammar", label: "Fix grammar", desc: "Correct spelling & grammar" },
  { id: "continue", label: "Continue writing", desc: "AI continues your text" },
];

export function AiPanel({ documentId, content, onApply, onClose }: AiPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const runAi = async (action: AiAction) => {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action, text: content }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "AI request failed");
      } else {
        setResult(data.result ?? "");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex w-80 flex-col border-l border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-violet-200/60 px-4 py-3.5">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          AI Assistant
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI panel"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-violet-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            disabled={loading || !content.trim()}
            onClick={() => void runAi(action.id)}
            className="w-full rounded-xl border border-violet-200/60 bg-white/80 p-3 text-left transition-all hover:border-violet-300 hover:bg-white hover:shadow-sm disabled:opacity-50"
          >
            <p className="text-sm font-medium text-slate-900">{action.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{action.desc}</p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm text-violet-600">
          <Wand2 className="h-4 w-4 animate-pulse" aria-hidden />
          Thinking…
        </div>
      )}
      {error && (
        <p className="mx-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-1 flex-col p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-600">
            Result
          </p>
          <div className="flex-1 overflow-y-auto rounded-xl border border-violet-200/60 bg-white p-3 text-sm leading-relaxed text-slate-700">
            {result}
          </div>
          <button
            type="button"
            onClick={() => onApply(result)}
            className="btn-primary mt-3 w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            Apply to document
          </button>
        </div>
      )}
    </aside>
  );
}
