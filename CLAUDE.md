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
- **Authentication**: Clerk (@clerk/clerk-react)
- **Data Fetching**: TanStack Query v5
- **State**: React Query for server state, localStorage for view mode
- **Markdown**: react-markdown + remark-gfm
- **Syntax Highlighting**: Shiki
- **Diagrams**: Mermaid

### Backend (apps/api)
- **Framework**: Hono (ultra-fast, runs on Vercel Functions)
- **Database**: Neon Postgres (serverless)
- **ORM**: Drizzle ORM (type-safe queries)
- **Authentication**: Clerk (@hono/clerk-auth middleware)
- **Deployment**: Vercel Functions (serverless)

### Shared Types (packages/shared)
- TypeScript interfaces shared between frontend and backend
- Includes: MarkdownFile, Share, User, API input/output types

## Development Commands

### Core Commands
- `pnpm dev` - Start frontend dev server (from root)
- `pnpm build` - Build frontend and API
- `pnpm lint` - Run ESLint

### Database Commands (from apps/api)
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio (database GUI)
- `pnpm db:generate` - Generate migrations

### Package Manager
- **Always use pnpm** (not npm or yarn)
- Install workspace packages: `pnpm install`
- Add package to specific app: `pnpm -F @markdown-viewer/web add <package>@latest`

## Key Components & Files

### Frontend (apps/web/src)

**Core Pages**:
- `App.tsx` - Main app with auth gates, file management, editor/preview
- `main.tsx` - App entry point with Clerk and React Query providers

**Components** (`components/`):
- `editor.tsx` - Markdown editor (textarea)
- `preview.tsx` - Markdown preview with custom renderers
- `file-sidebar.tsx` - File list with CRUD operations
- `mode-toggle.tsx` - View mode switcher (split/edit/preview)
- `mermaid.tsx` - Mermaid diagram renderer
- `scroll-to-top.tsx` - Scroll to top button

**Hooks** (`hooks/`):
- `use-files.ts` - React Query hooks for file CRUD
- `use-shares.ts` - React Query hooks for sharing

**API Client** (`lib/`):
- `api.ts` - Fetch wrappers for all API endpoints
- `query-client.ts` - TanStack Query configuration

**Utilities** (`utils/`):
- `storage.ts` - ViewMode localStorage persistence, type definitions
- `highlighter.ts` - Shiki syntax highlighter singleton

### Backend (apps/api)

**Entry Point**:
- `index.ts` - Hono app with routes and middleware, exported for Vercel

**Routes** (`routes/`):
- `files.ts` - File CRUD endpoints (protected)
- `shares.ts` - Share link endpoints (create protected, get public)

**Database** (`db/`):
- `schema.ts` - Drizzle schema (users, files, shares tables)
- `client.ts` - Neon database client

**Middleware** (`middleware/`):
- `auth.ts` - Clerk authentication helpers

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

## Database Schema

**users** (synced from Clerk):
- id: text (PK, Clerk user ID)
- email: text
- createdAt: timestamp

**files**:
- id: uuid (PK)
- userId: text (FK → users.id)
- name: text
- content: text
- createdAt: timestamp
- updatedAt: timestamp

**shares**:
- id: uuid (PK)
- fileId: uuid (FK → files.id, cascade delete)
- shareToken: text (unique)
- createdAt: timestamp
- expiresAt: timestamp (nullable)
- viewCount: integer

## Authentication Flow

1. User signs in via Clerk
2. Clerk provider wraps app in `main.tsx`
3. API requests include Clerk session token
4. Hono middleware validates token
5. User auto-created in database on first API request

## Key Technical Details

- **Syntax Highlighting**: Shiki with lazy initialization. Languages: JS, TS, TSX, JSX, CSS, HTML, JSON, Markdown, Bash, Python, Java, Go, Rust, PHP, Ruby
- **Mermaid Integration**: Renders in code blocks with `mermaid` language. Error handling + loading states
- **Anchor Links**: Headings auto-generate IDs (kebab-case). Custom link renderer handles smooth scrolling
- **Inline vs Block Code**: Distinguishes by className or newlines for different styling
- **View Mode Persistence**: Saved to localStorage (split/edit/preview)
- **Optimistic Updates**: TanStack Query handles optimistic UI updates
- **File Changes**: Debounced API calls via mutation (not auto-save on every keystroke)

## Environment Variables

Required in `.env`:
```env
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon Postgres
DATABASE_URL=postgresql://...@....neon.tech/...
```

## Deployment

**Platform**: Vercel
**Config**: `vercel.json` in root
- Frontend: Static site from `apps/web/dist`
- API: Vercel Functions from `apps/api/index.ts`
- Rewrites: `/api/*` → API functions

## Code Style

- **TypeScript**: Strict mode, typed components with Props interfaces
- **Components**: Functional with hooks (useState, useEffect)
- **Naming**: Components = PascalCase, utilities = camelCase, files = kebab-case
- **Imports**: Use workspace aliases (`@markdown-viewer/shared`)
- **ESLint**: Configured for TypeScript with react-hooks and react-refresh

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

### Add shared type
1. Update `packages/shared/index.ts`
2. TypeScript will auto-update in both apps (workspace reference)
