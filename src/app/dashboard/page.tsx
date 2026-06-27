"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { formatDate } from "@/lib/utils";
import { getLocalDb } from "@/lib/local-db";
import { AppHeader } from "@/components/app-header";
import { LoadingScreen } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { FileText, LogOut, Plus, Clock } from "lucide-react";

interface DocSummary {
  id: string;
  title: string;
  content: string;
  role: string;
  updatedAt: string;
  ownerName?: string;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        role === "OWNER" && "badge-owner",
        role === "EDITOR" && "badge-editor",
        role === "VIEWER" && "badge-viewer",
        !["OWNER", "EDITOR", "VIEWER"].includes(role) && "badge-viewer"
      )}
    >
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function load() {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = (await res.json()) as DocSummary[];
        setDocs(data);

        const db = getLocalDb();
        for (const doc of data) {
          const existing = await db.documents.get(doc.id);
          if (!existing) {
            await db.documents.put({
              id: doc.id,
              title: doc.title,
              content: doc.content ?? "",
              role: doc.role as "OWNER" | "EDITOR" | "VIEWER",
              lamport: 0,
              lastSyncedLamport: 0,
              updatedAt: doc.updatedAt,
            });
          } else {
            await db.documents.put({
              ...existing,
              title: doc.title,
              role: doc.role as "OWNER" | "EDITOR" | "VIEWER",
              updatedAt: doc.updatedAt,
            });
          }
        }
      }
      setLoading(false);
    }

    void load();
  }, [status]);

  const createDocument = async () => {
    setCreating(true);
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document" }),
    });

    if (res.ok) {
      const doc = await res.json();
      window.location.href = `/documents/${doc.id}`;
    }
    setCreating(false);
  };

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return (
      <div className="page-mesh flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600">
          Please{" "}
          <Link href="/auth/signin" className="font-medium text-brand-600 hover:text-brand-700">
            sign in
          </Link>{" "}
          to continue.
        </p>
      </div>
    );
  }

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="page-mesh min-h-screen">
      <AppHeader>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-semibold text-white">
              {initials ?? session?.user?.email?.[0]?.toUpperCase()}
            </span>
            <span className="max-w-[160px] truncate text-sm text-slate-600">
              {session?.user?.email}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void createDocument()}
            disabled={creating}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">New document</span>
            <span className="sm:hidden">New</span>
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-secondary btn-sm"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Documents
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {docs.length === 0 && !loading
              ? "Create your first document to get started"
              : `${docs.length} document${docs.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            Loading documents…
          </div>
        )}

        {!loading && docs.length === 0 && (
          <div className="surface-card flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <FileText className="h-8 w-8 text-brand-500" aria-hidden />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">No documents yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Your workspace is empty. Create a document and start writing — it works offline too.
            </p>
            <button
              type="button"
              onClick={() => void createDocument()}
              disabled={creating}
              className="btn-primary mt-6"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Create first document
            </button>
          </div>
        )}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`} className="surface-card-hover group block p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 transition-colors group-hover:bg-brand-50">
                    <FileText
                      className="h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-500"
                      aria-hidden
                    />
                  </div>
                  <RoleBadge role={doc.role} />
                </div>
                <h3 className="mt-4 truncate font-semibold text-slate-900 group-hover:text-brand-700">
                  {doc.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {doc.content?.trim() || "Empty document"}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Updated {formatDate(doc.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
