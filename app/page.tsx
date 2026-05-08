import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mocket — Mock server",
  description:
    "Mock server local: crie respostas por rota e método e teste via /api/mock.",
};

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-3xl px-6 py-14 sm:py-16">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Mock server
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
          Bem-vindo ao Mocket
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Simule APIs sem backend: combine regras de path e método, chame{" "}
          <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            /api/mock/…
          </code>{" "}
          e veja o tráfego na admin.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/admin/mocks/new"
            className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Criar mock
          </Link>
          <Link
            href="/admin/requests"
            className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Ver requests
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Painel admin
          </Link>
        </div>

        <section className="mt-14">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Tutorial rápido
          </h2>
          <ol className="mt-4 space-y-4 text-zinc-600 dark:text-zinc-400">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                1
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                  Crie um mock:
                </strong>{" "}
                método (GET, POST, …), path (exato,{" "}
                <code className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  /users/:id
                </code>
                , ou wildcard simples), status e corpo da resposta. Use regras
                opcionais para query, headers ou body.
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                2
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                  Chame o executor:
                </strong>{" "}
                todo pedido vai para o prefixo{" "}
                <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  /api/mock/&lt;sua-rota&gt;
                </code>
                — por exemplo{" "}
                <code className="font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  /api/mock/hello
                </code>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                3
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                  Confira na admin:
                </strong>{" "}
                a página Requests mostra chamadas recentes em memória para
                depurar método, URL e payloads.
              </span>
            </li>
          </ol>
        </section>

        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Exemplo com curl
          </div>
          <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 sm:text-sm">
            {`curl -i http://<your-domain>:3001/api/mock/hello

curl -i -X POST http://<your-domain>:3001/api/mock/users \\
  -H "content-type: application/json" \\
  -d '{"name":"Ada"}'`}
          </pre>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Porta padrão do script <code className="font-mono">yarn dev</code>{" "}
            neste projeto: 3001. Ajuste o host/porta conforme seu ambiente.
          </p>
        </div>
      </main>
    </div>
  );
}
