This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
yarn
yarn dev
```

Open [http://<your-domain>:3000](http://<your-domain>:3000) with your browser to see the result.

### Mock Server (Beeceptor-like)

Este projeto implementa um **mock server** com:

- **Admin UI**: gerenciar mocks e testar requests.
- **Executor**: endpoint catch-all que serve respostas mockadas por **método + path + regras**.
- **Persistência**: em desenvolvimento (sem token Blob), arquivo local `data/mock-registry.json`. Na Vercel com [Blob](https://vercel.com/docs/storage/vercel-blob), o estado vivo fica no store; o arquivo no repo continua útil como referência e seed local.

#### Admin UI

- `http://<your-domain>:3000/admin` (home)
- `http://<your-domain>:3000/admin/mocks` (listagem + criação/edição + request builder)
- `http://<your-domain>:3000/admin/requests` (requests recentes em memória)

#### Endpoint de execução (mock)

Todas as chamadas devem ser feitas para o prefixo abaixo:

- **`/api/mock/<sua-rota>`**

Exemplos:

```bash
# GET
curl -i http://<your-domain>:3000/api/mock/hello

# POST com JSON
curl -i -X POST http://<your-domain>:3000/api/mock/users \
  -H "content-type: application/json" \
  -d '{"name":"Ada"}'
```

#### Matching (MVP)

- **Path**:
  - exato: `/users/1`
  - com parâmetro: `/users/:id`
  - wildcard simples: `/users/*`
- **Regras** (opcionais): query/headers (`equals|contains|regex`) e body (`rawContains|rawRegex|jsonEquals`).
- **Desempate**: `priority` maior vence.

#### Armazenamento

- **Local (sem `BLOB_MOCKET_READ_WRITE_TOKEN`)**: os mocks ficam em `data/mock-registry.json`. A Admin UI atualiza esse arquivo automaticamente.

- **Produção na Vercel**: o filesystem da função não permite escrita durável. Com um **Blob store** ligado ao projeto, a variável `BLOB_MOCKET_READ_WRITE_TOKEN` é injetada automaticamente; o app passa a ler/escrever o registry em um objeto fixo no Blob (`mocket/mock-registry.json`).

**Variáveis de ambiente**

| Variável                       | Descrição                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `BLOB_MOCKET_READ_WRITE_TOKEN` | Se definida (ex.: deploy na Vercel com Blob store), usa Vercel Blob em vez do disco. Localmente: `vercel env pull`. |
| `MOCK_REGISTRY_BLOB_ACCESS`    | Opcional: `private` (padrão) ou `public`. Deve coincidir com o tipo da loja Blob no dashboard.                      |
| `MOCK_REGISTRY_FORCE_FS`       | Se `true`, força uso do arquivo local mesmo havendo token (debug local).                                            |

**Primeiro deploy com Blob**

- Se o objeto ainda não existir no store, o registry começa vazio até a primeira gravação pela Admin UI (ou até você enviar `data/mock-registry.json` manualmente com `vercel blob put`, pelo dashboard, etc.).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Para persistir mocks em produção na Vercel, crie um **Blob store** no projeto (Storage → Blob) para habilitar `BLOB_MOCKET_READ_WRITE_TOKEN`; veja a secção **Armazenamento** acima.
