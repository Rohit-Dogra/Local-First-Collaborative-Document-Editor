import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="page-mesh flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="glass-card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </div>

        {children}

        <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-slate-400 transition-colors hover:text-brand-600"
      >
        ← Back to home
      </Link>
    </div>
  );
}
