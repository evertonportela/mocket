import Link from "next/link";

const HOST_DOMAIN = process.env.HOST_DOMAIN ?? "localhost:3000";

export default function AdminHome() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Mock Server
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Crie e teste mocks de APIs via rotas, métodos e payload.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/mocks"
            className="rounded-xl border border-zinc-200 bg-white p-5 text-black hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="text-lg font-medium">Mocks</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Listar, criar e editar respostas mockadas.
            </div>
          </Link>

          <Link
            href="/admin/requests"
            className="rounded-xl border border-zinc-200 bg-white p-5 text-black hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            <div className="text-lg font-medium">Requests</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Visualizar requests recentes (memória).
            </div>
          </Link>
        </div>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Endpoint de execução
          </div>
          <div className="mt-2 font-mono text-sm text-zinc-700 dark:text-zinc-300">
            {HOST_DOMAIN}/api/mock/&lt;sua-rota&gt;
          </div>
        </div>
      </main>
    </div>
  );
}
