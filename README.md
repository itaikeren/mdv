# Markdown Viewer

A minimal and focused markdown viewer built with Vite, React, and modern tools. Now with multi-user support, authentication, and cloud storage!

## Features

- 🎨 **Clean, minimal design** - Focus on what matters: your content
- ⚡ **Split screen mode** - Edit and preview side by side
- 📱 **Mobile responsive** - Works great on all screen sizes
- 🎯 **Full screen modes** - Toggle between edit and preview
- 🌈 **Syntax highlighting** - Beautiful code blocks with Shiki
- 📝 **GitHub Flavored Markdown** - Support for tables, checkboxes, and more
- 🔐 **Authentication** - Secure user accounts with Clerk
- ☁️ **Cloud Storage** - Your files are saved to the cloud
- 🔗 **Share Links** - Share read-only preview links with anyone
- 📊 **Mermaid Diagrams** - Render flowcharts and diagrams

## Tech Stack

### Frontend
- **Vite** - Build tool for fast development
- **React 19** - UI framework
- **Tailwind CSS v4** - Utility-first CSS
- **Shiki** - Syntax highlighting
- **react-markdown** - Markdown parser with remark-gfm
- **TanStack Query** - Data fetching and caching
- **Clerk** - Authentication

### Backend
- **Hono** - Ultra-fast API framework
- **Vercel Functions** - Serverless deployment
- **Neon Postgres** - Serverless database
- **Drizzle ORM** - Type-safe database queries

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Clerk account (free tier available)
- Neon database (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd markdown-viewer
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Get Clerk keys from https://dashboard.clerk.com
- Get Neon database URL from https://neon.tech

4. Push database schema:
```bash
cd apps/api
pnpm db:push
```

5. Start development server:
```bash
pnpm dev
```

Open http://localhost:5173

## Project Structure

```
markdown-viewer/
├── apps/
│   ├── web/                    # Vite React frontend
│   │   ├── src/
│   │   │   ├── components/    # UI components
│   │   │   ├── hooks/         # React Query hooks
│   │   │   ├── lib/           # API client & utilities
│   │   │   └── utils/         # Helper functions
│   │   └── package.json
│   └── api/                    # Hono API (Vercel Functions)
│       ├── routes/            # API routes
│       ├── db/                # Drizzle schema & client
│       ├── middleware/        # Auth middleware
│       └── index.ts           # API entry point
├── packages/
│   └── shared/                # Shared TypeScript types
└── package.json               # Root workspace config
```

## Available Commands

```bash
# Development
pnpm dev              # Start frontend dev server

# Build
pnpm build           # Build for production

# Database
cd apps/api
pnpm db:push         # Push schema to database
pnpm db:studio       # Open Drizzle Studio
pnpm db:generate     # Generate migrations

# Linting
pnpm lint            # Run ESLint
```

## Deployment

### Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL`
3. Deploy!

Vercel will automatically detect the monorepo and deploy both frontend and API.

## Environment Variables

Create a `.env` file in the root directory:

```env
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon Database
DATABASE_URL=postgresql://...@....neon.tech/...
```

## API Endpoints

### Files
- `GET /api/files` - List all user's files
- `POST /api/files` - Create a new file
- `GET /api/files/:id` - Get a specific file
- `PUT /api/files/:id` - Update a file
- `DELETE /api/files/:id` - Delete a file

### Shares
- `POST /api/shares` - Create a share link
- `GET /api/shares/:token` - Get shared file (public, no auth)
- `GET /api/shares/file/:fileId` - List shares for a file
- `DELETE /api/shares/:id` - Delete a share

## Database Schema

**Users** (synced from Clerk)
- id (text, primary key)
- email (text)
- createdAt (timestamp)

**Files**
- id (uuid, primary key)
- userId (text, foreign key)
- name (text)
- content (text)
- createdAt (timestamp)
- updatedAt (timestamp)

**Shares**
- id (uuid, primary key)
- fileId (uuid, foreign key)
- shareToken (text, unique)
- createdAt (timestamp)
- expiresAt (timestamp, nullable)
- viewCount (integer)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ using modern web technologies.
