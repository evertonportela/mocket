import Link from "next/link";
import { notFound } from "next/navigation";
import MockEditor from "@/app/admin/_components/MockEditor";
import { getMock } from "@/lib/storage/mockRegistry";

export default async function EditMockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mock = await getMock(id);
  if (!mock) notFound();

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Editar mock
          </h1>
          <Link
            href="/admin/mocks"
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
          >
            Voltar
          </Link>
        </div>

        <div className="mt-6">
          <MockEditor mode="edit" initial={mock} />
        </div>
      </main>
    </div>
  );
}
