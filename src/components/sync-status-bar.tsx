"use client";

import { useEffect, useState } from "react";
import type { SyncStatus } from "@/lib/sync/engine";
import { getSyncEngine } from "@/lib/sync/engine";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";

export function SyncStatusBar() {
  const [status, setStatus] = useState<SyncStatus>({
    online: true,
    syncing: false,
    pendingCount: 0,
    lastError: null,
    lastSyncedAt: null,
  });

  useEffect(() => {
    return getSyncEngine().subscribe(setStatus);
  }, []);

  const statusColor = status.syncing
    ? "text-brand-600 bg-brand-50 ring-brand-200/60"
    : status.online
      ? status.pendingCount > 0
        ? "text-amber-700 bg-amber-50 ring-amber-200/60"
        : "text-emerald-700 bg-emerald-50 ring-emerald-200/60"
      : "text-amber-700 bg-amber-50 ring-amber-200/60";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1",
        statusColor
      )}
      role="status"
      aria-live="polite"
      aria-label="Sync status"
    >
      {status.syncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : status.online ? (
        <Cloud className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      )}

      <span>
        {status.syncing
          ? "Syncing…"
          : status.online
            ? status.pendingCount > 0
              ? `${status.pendingCount} pending`
              : "Synced"
            : "Offline"}
      </span>

      {status.lastError && (
        <span className="flex items-center gap-1 text-red-600" title={status.lastError}>
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </div>
  );
}
