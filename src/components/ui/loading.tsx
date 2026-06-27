import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="page-mesh flex min-h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-brand-600", className)} aria-hidden />;
}
