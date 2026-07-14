# Contributing

Thanks for your interest in mdv. Bug reports, ideas, and pull requests are all welcome.

For security bugs, **do not open an issue** — follow [SECURITY.md](./SECURITY.md) instead.

## Setup

You'll need Node.js 20+, pnpm, a [Clerk](https://clerk.com) app, and a
[Neon](https://neon.tech) database (both have free tiers).

```bash
pnpm install
```

Create `.env.local` in the repo root — see [the README](./README.md#self-hosting) for the
variables. Then push the schema and start both dev servers:

```bash
pnpm --filter @markdown-viewer/api db:push
pnpm dev     # web on :5173, api on :3000
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Frontend + API dev servers |
| `pnpm build` | Build both apps |
| `pnpm lint` | oxlint across every package |
| `pnpm typecheck` | Typecheck the API and its Vercel function entrypoint |
| `pnpm format` | Format with oxfmt |
| `pnpm format:check` | Check formatting without writing |

CI runs `lint`, `format:check`, `typecheck`, and `build` on every pull request. Please make
sure those pass locally first — they are exactly what CI runs.

> **Note:** there is no automated test suite yet. Until there is, please describe how you
> manually verified a change in the pull request. Tests are very welcome contributions.

## Conventions

- **TypeScript strict mode.** Avoid `any` — prefer real, informative types.
- **Files are kebab-case** (`my-component.tsx`); components are PascalCase, utilities camelCase.
- **Linting/formatting** is oxlint + oxfmt. Leave no lint or type errors.
- **Shared types** go in `packages/shared` and are imported via `@markdown-viewer/shared`.
- Don't commit secrets. `.env.local` is gitignored — keep it that way.

## Adding things

**An API endpoint:** add the route in `apps/api/routes/`, mount it in `apps/api/index.ts`,
add a React Query hook in `apps/web/src/hooks/`, then use it in a component.

**A database table:** update `apps/api/db/schema.ts`, run `pnpm db:push` from `apps/api`,
and add the types to `packages/shared`.

**An MCP tool:** add it in `apps/api/mcp/server.ts` with a zod schema, and document every
input with `.describe()` — agents rely on those descriptions to call the tool correctly.
Update the tool table in the README.

## Pull requests

Keep them focused — one concern per PR. Explain *why*, not just what; the diff already says
what. If you're planning something large, open an issue first so we can agree on the shape
before you spend time on it.
