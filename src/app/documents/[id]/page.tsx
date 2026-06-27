import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDocumentAccess } from "@/lib/api-auth";
import { DocumentEditor } from "@/components/document-editor";
import { ChevronLeft } from "lucide-react";
import { redirect, notFound } from "next/navigation";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { id } = await params;
  const access = await getDocumentAccess(id, session.user.id);

  if (!access) notFound();

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <div className="border-b border-slate-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to documents
        </Link>
      </div>

      <DocumentEditor
        documentId={access.document.id}
        initialTitle={access.document.title}
        initialContent={access.document.content}
        role={access.role}
      />
    </div>
  );
}
