import Link from "next/link";
import { auth } from "@/lib/auth";
import { AppHeader, NavLink } from "@/components/app-header";
import { ArrowRight, History, Shield, Wifi, Zap } from "lucide-react";

export default async function HomePage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Auth/DB misconfigured — still render the marketing page
  }

  return (
    <div className="page-mesh">
      <AppHeader>
        <nav className="flex items-center gap-2">
          {session ? (
            <NavLink href="/dashboard" variant="primary">
              Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden />
            </NavLink>
          ) : (
            <>
              <NavLink href="/auth/signin">Sign in</NavLink>
              <NavLink href="/auth/register" variant="primary">
                Get started
              </NavLink>
            </>
          )}
        </nav>
      </AppHeader>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50/80 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            Local-first · Offline-ready
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
            Write together,{" "}
            <span className="gradient-text">even offline</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Edit documents instantly without waiting for the network. Sync when you&apos;re back
            online, merge conflicts automatically, and travel through version history.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
                Open dashboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <>
                <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
                  Start for free
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="/auth/signin" className="btn-secondary px-6 py-3 text-base">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          <Feature
            icon={Wifi}
            title="Offline-first"
            desc="IndexedDB is the source of truth. Your typing never waits on the network."
            accent="from-blue-500 to-cyan-500"
          />
          <Feature
            icon={Shield}
            title="Role-based access"
            desc="Owner, Editor, and Viewer roles enforced on every API request."
            accent="from-brand-500 to-violet-500"
          />
          <Feature
            icon={History}
            title="Version time travel"
            desc="Capture snapshots and restore safely via the operation log."
            accent="from-violet-500 to-purple-500"
          />
        </div>

        <div className="mt-16 rounded-2xl border border-slate-200/80 bg-white/60 p-8 text-center shadow-card backdrop-blur-sm sm:p-12">
          <p className="text-sm font-medium uppercase tracking-wider text-brand-600">
            Built for reliability
          </p>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Deterministic conflict resolution, real-time sync, and AI-assisted writing — all in one
            clean editor.
          </p>
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: typeof Wifi;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <article className="surface-card-hover group p-6">
      <div
        className={`inline-flex rounded-xl bg-gradient-to-br ${accent} p-2.5 text-white shadow-sm transition-transform duration-200 group-hover:scale-105`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}
