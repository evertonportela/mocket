import Link from "next/link";
import MocksTable from "@/app/admin/_components/MocksTable";
import RequestBuilder from "@/app/admin/_components/RequestBuilder";

export default function MocksPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">Mocks</h1>
          <Link
            href="/admin"
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            Voltar
          </Link>
        </div>

        <div className="mt-6">
          <MocksTable />
        </div>

        <div className="mt-6">
          <RequestBuilder />
        </div>
      </main>
    </div>
  );
}

