import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-sm transition-shadow group-hover:shadow-glow">
        <FileText className="h-4 w-4" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">
        Collab<span className="text-brand-600">Docs</span>
      </span>
    </Link>
  );
}
