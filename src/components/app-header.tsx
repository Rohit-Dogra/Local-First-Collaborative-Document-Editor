import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export function AppHeader({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Logo />
        {children}
      </div>
    </header>
  );
}

export function NavLink({
  href,
  children,
  variant = "ghost",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "ghost" | "primary";
}) {
  return (
    <Link
      href={href}
      className={variant === "primary" ? "btn-primary" : "btn-ghost rounded-xl"}
    >
      {children}
    </Link>
  );
}
