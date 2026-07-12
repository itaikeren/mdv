# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack markdown viewer built with Vite + React (frontend) and Hono API (backend). Features multi-user authentication, cloud storage, file sharing, split-screen editing with live preview, syntax highlighting via Shiki, Mermaid diagram support, and GitHub Flavored Markdown rendering.

## Architecture

### Monorepo Structure
```
markdown-viewer/
├── apps/
│   ├── web/          # Vite React frontend
│   └── api/          # Hono API (Vercel Functions)
├── packages/
│   └── shared/       # Shared TypeScript types
```

### Frontend (apps/web)
- **Framework**: Vite + React 19
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Authentication**: Clerk (@clerk/clerk-react)
- **Data Fetching**: TanStack Query v5
- **Markdown**: react-markdown + remark-gfm
- **Syntax Highlighting**: Shiki
- **Diagrams**: Mermaid
- **Linting/Formatting**: oxlint + oxfmt

### Backend (apps/api)
- **Framework**: Hono (runs on Vercel Functions)
- **Database**: Neon Postgres (serverless) + Drizzle ORM
- **Authentication**: Clerk (@hono/clerk-auth middleware)
- **Linting/Formatting**: oxlint + oxfmt

### Shared Types (packages/shared)
- TypeScript interfaces shared between frontend and backend
- Includes: MarkdownFile, Share, User, API input/output types

## Development Commands

### Core Commands
- `pnpm dev` - Start frontend + API dev servers concurrently
- `pnpm build` - Build frontend and API
- `pnpm lint` - Run oxlint on web
- `pnpm agent:login` - Agent mode: print a one-time sign-in URL for automated testing (see below)

### Agent Mode (dev auth bypass for automated testing)
To test authenticated flows without the email/password/captcha wall (dev only):
1. Run `pnpm agent:login` from the repo root - it prints a URL like `http://localhost:5173/?__agent_ticket=...`
2. Open that URL in the browser under test - it signs in as the shared `agent@example.com` test user via a single-use Clerk sign-in ticket (expires in 10 min)

The ticket consumer (`apps/web/src/dev/agent-auth.tsx`) only exists in dev builds, and the script refuses non-test Clerk keys. Override `AGENT_EMAIL` / `APP_URL` env vars if needed. The API dev server port can be overridden with `PORT` (default 3000) and the web proxy target with `API_PROXY_TARGET` (default `http://localhost:3000`).

### Linting & Formatting
- `pnpm -F <package> lint` - Run oxlint
- `pnpm -F <package> format` - Format with oxfmt
- `pnpm -F <package> format:check` - Check formatting

### Database (from apps/api)
- `pnpm db:push` - Push schema changes to the dev database (DATABASE_URL)
- `pnpm db:push:prod` - Push schema changes to the production database (DATABASE_URL_PROD)
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:generate` - Generate migrations

Dev and prod are separate Neon branches - schema changes must be pushed to both.

### Package Manager
- **Always use pnpm** (not npm or yarn)
- Add package to specific app: `pnpm -F @markdown-viewer/web add <package>@latest`

## API Endpoints

### Files (Protected)
- `GET /api/files` - List user's files
- `POST /api/files` - Create file
- `GET /api/files/:id` - Get file
- `PUT /api/files/:id` - Update file
- `DELETE /api/files/:id` - Delete file

### Shares
- `POST /api/shares` - Create share link (protected)
- `GET /api/shares/:token` - Get shared file (public)
- `GET /api/shares/file/:fileId` - List shares for file (protected)
- `DELETE /api/shares/:id` - Delete share (protected)

## Agents / MCP

Agents can publish and read documents over an [MCP](https://modelcontextprotocol.io) Streamable HTTP endpoint, authenticated with an API key (`mdv_...`, created in the app's API Keys UI).

- **Endpoint**: `POST /api/mcp` (stateless Streamable HTTP; no session ids)
- **Auth**: `Authorization: Bearer mdv_...`. Missing/invalid keys get `401` with `WWW-Authenticate: Bearer`.
- **Implementation**: `apps/api/mcp/server.ts` (v1 MCP SDK `McpServer` + `@hono/mcp` `StreamableHTTPTransport`), mounted in `apps/api/index.ts`.

Register it with Claude Code:

```bash
claude mcp add --transport http mdv https://<app>/api/mcp --header "Authorization: Bearer mdv_..."
```

**Tools** (all inputs are documented via zod `.describe()` schemas):
- `publish_document({ name, content, comments_enabled?, allow_anonymous_comments? })` - creates a doc + share; returns `{ fileId, shareToken, shareUrl, rawUrl }`. Comments default **on** for agent-published docs. `rawUrl` is directly fetchable `text/markdown`.
- `read_document({ token_or_url })` - returns `{ name, content, updatedAt }` for any public share (bare token or share/raw URL).
- `update_document({ file_id_or_token, content, name? })` - replaces content (and optionally renames) a doc you own; existing links keep working.
- `list_documents({ query? })` - your files (most recent first, max 100) with any share tokens; optional case-insensitive name filter.
- `get_comments({ token })` - comments incl. line anchors and `isOutdated`.
- `add_comment({ token, content, anchor_start_line?, anchor_end_line?, parent_id? })` - posts as the key's user; supports line anchors and single-level replies.

## Environment Variables

Required in `.env`:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...@....neon.tech/...          # dev Neon branch
DATABASE_URL_PROD=postgresql://...@....neon.tech/...     # prod Neon branch (db:push:prod)
```

Optional:
```env
# Extra origins allowed to call the API cross-origin (comma-separated).
# Same-origin (prod rewrites / dev proxy) and localhost always work.
ALLOWED_ORIGINS=https://example.com
```

## Deployment

**Platform**: Vercel
- Frontend: Static site from `apps/web/dist`
- API: Vercel Functions from `apps/api/index.ts`
- Rewrites: `/api/*` → API functions

## Code Style

- **TypeScript**: Strict mode, typed components with Props interfaces
- **Naming**: Components = PascalCase, utilities = camelCase, files = kebab-case
- **Imports**: Use workspace aliases (`@markdown-viewer/shared`)
- **Linting**: oxlint (web: react, typescript, import, react-perf plugins; api: typescript, import plugins)
- **Formatting**: oxfmt

## Common Tasks

### Add a new API endpoint
1. Add route in `apps/api/routes/`
2. Import and mount in `apps/api/index.ts`
3. Create React Query hook in `apps/web/src/hooks/`
4. Use hook in component

### Add database table
1. Update `apps/api/db/schema.ts`
2. Run `pnpm db:push` from `apps/api`
3. Update types in `packages/shared/index.ts`
