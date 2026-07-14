<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/logo-dark.svg">
    <img src=".github/logo-light.svg" alt="mdv" width="184">
  </picture>
</p>

<p align="center"><strong>Write it in markdown. Ship it as a link.</strong></p>

<p align="center">
  A fast markdown workspace — split-screen editing, live preview, one-click share links.<br>
  With a built-in MCP server, so your AI agents can publish here too.
</p>

<p align="center">
  <a href="https://mdv.itai.sh">Hosted service</a> ·
  <a href="#mcp--publishing-from-an-agent">MCP</a> ·
  <a href="#self-hosting">Self-hosting</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a> ·
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-141414" alt="License: Apache-2.0" valign="middle"></a>
</p>

---

Most markdown tools assume a human is doing the typing. Increasingly, one isn't.

An agent finishes a task and produces a changelog, a migration plan, a design doc — and
then has nowhere to put it. It gets pasted into a chat window, where it can't be linked,
commented on, or updated.

mdv is a normal markdown app for humans (split-screen editor, live preview, Mermaid,
syntax highlighting, share links) that also speaks [MCP](https://modelcontextprotocol.io).
An agent publishes a document, gets back a URL, and a human opens that URL and comments on
a specific line. The agent reads the comments and revises. No copy-paste in either direction.

## MCP — publishing from an agent

Register the server with any MCP client. With Claude Code:

```bash
claude mcp add --transport http mdv https://mdv.itai.sh/api/mcp \
  --header "Authorization: Bearer mdv_..."
```

Create the `mdv_...` API key in the app's **API Keys** UI. Keys are scoped `docs` (the
default, and all that any MCP tool needs) or `full`.

| Tool | What it does |
|---|---|
| `publish_document` | Creates a doc + share link. Returns `shareUrl` and a directly fetchable `rawUrl` |
| `read_document` | Reads any public share, by token or URL |
| `update_document` | Replaces content of a doc you own; existing links keep working |
| `list_documents` | Your documents, most recent first |
| `get_comments` | Comments, with line anchors and an `isOutdated` flag |
| `add_comment` | Posts a comment, optionally anchored to a line range |

Comments anchor to line ranges and are marked outdated when the underlying lines change, so
a review survives the document being edited under it.

The endpoint is stateless Streamable HTTP (JSON-RPC over POST) at `/api/mcp`, implemented
with the MCP TypeScript SDK on Hono — see [`apps/api/mcp/server.ts`](apps/api/mcp/server.ts).

## Features

- **Split-screen editing** with live preview
- **Share links** — public, read-only, one click
- **Line-anchored comments**, including from anonymous visitors
- **Mermaid diagrams** and **Shiki** syntax highlighting
- **GitHub Flavored Markdown** — tables, task lists, footnotes
- **MCP server** for agents, with scoped API keys
- Multi-user auth, cloud storage, per-user quotas

## Self-hosting

mdv runs on Vercel with two managed services: [Clerk](https://clerk.com) for auth and
[Neon](https://neon.tech) for Postgres. Both have free tiers.

**Prerequisites:** Node.js 20+, pnpm, a Clerk app, and a Neon database.

```bash
git clone https://github.com/itaikeren/mdv.git
cd mdv
pnpm install
```

Create `.env.local` in the repo root:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # frontend (Vite inlines this at build)
CLERK_PUBLISHABLE_KEY=pk_test_...        # backend (Clerk middleware)
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...@....neon.tech/...
```

Push the schema and start both dev servers:

```bash
pnpm --filter @mdv/api db:push
pnpm dev     # web on :5173, api on :3000
```

> **Deploying:** set the same variables in your host's environment. `VITE_`-prefixed values
> are compiled into the client bundle, so a change to them requires a rebuild — and for the
> same reason, never give a secret a `VITE_` prefix. `DATABASE_URL` should point at your
> production database.

## Architecture

```
apps/
  web/        Vite + React 19, Tailwind v4, TanStack Query, React Router
  api/        Hono on Vercel Functions, Drizzle ORM, Neon Postgres
  api/mcp/    MCP Streamable HTTP server
packages/
  shared/     TypeScript types shared across the frontend and API
```

Abuse-prone writes carry Postgres-backed rate limits and each user has a storage quota.
Rate limiting **fails open** — a database error allows the request, because it is anti-abuse,
not a security boundary. The real boundaries are Clerk sessions, sha256-hashed API keys, and
per-user ownership checks.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for commands and conventions, and
[CLAUDE.md](./CLAUDE.md) for the working notes agents use in this repo.

## Security

Please report vulnerabilities privately — see [SECURITY.md](./SECURITY.md). Do not open a
public issue for a security bug.

## License

[Apache-2.0](./LICENSE)
