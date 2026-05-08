import Link from "next/link";
import RequestsViewer from "@/app/admin/requests/requestsViewer";

export default function RequestsPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Requests</h1>
          <Link href="/admin" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
            Voltar
          </Link>
        </div>

        <div className="mt-6">
          <RequestsViewer />
        </div>
      </main>
    </div>
  );
}

