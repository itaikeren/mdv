# Database Management Guide

This guide covers all database operations using Drizzle ORM.

## Prerequisites

- `.env.local` file in monorepo root with `DATABASE_URL`
- Neon Postgres database connection string

---

## 📋 New Project Setup

When setting up the database for the first time:

```bash
# 1. Navigate to API directory
cd apps/api

# 2. Push schema to database (creates all tables)
pnpm db:push
```

**What this does:**
- Reads schema from `db/schema.ts`
- Creates tables in your Neon database
- No migration files generated (direct push)

---

## ➕ Adding a New Table

When you want to add a completely new table:

### Step 1: Define the table in schema

Edit `db/schema.ts`:

```typescript
export const myNewTable = pgTable('my_new_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Add relations if needed
export const myNewTableRelations = relations(myNewTable, ({ one, many }) => ({
  // Define relations here
}))
```

### Step 2: Update shared types (if needed)

Edit `packages/shared/index.ts`:

```typescript
export interface MyNewTable {
  id: string
  name: string
  createdAt: Date
}
```

### Step 3: Choose your approach

**Option A: Direct Push (Development)**
```bash
pnpm db:push
```
- Fast and simple
- No migration files
- Good for rapid development

**Option B: Generate Migration (Production)**
```bash
# Generate migration file
pnpm db:generate

# Review the generated SQL in drizzle/ folder

# Apply migration
pnpm db:migrate
```
- Creates migration history
- Good for production/team environments
- Allows rollback

---

## ✏️ Modifying an Existing Table

When changing columns, constraints, or indexes:

### Step 1: Update schema

Edit `db/schema.ts`:

```typescript
export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  // ✨ Add new column
  description: text('description'),
  // ✨ Modify existing column
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Step 2: Push changes

**For development:**
```bash
pnpm db:push
```

**For production:**
```bash
pnpm db:generate
pnpm db:migrate
```

---

## 🔗 Adding Relations

Relations are TypeScript-only helpers (don't change database):

```typescript
export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  shares: many(shares),
}))
```

After adding relations:
- No database push needed
- Relations only affect TypeScript queries

---

## 🗑️ Deleting a Table

### Step 1: Remove from schema

Remove the table definition and relations from `db/schema.ts`

### Step 2: Push changes

```bash
pnpm db:push
```

⚠️ **Warning:** This will DROP the table and all its data!

---

## 🔍 Inspecting Database

Open Drizzle Studio to view and edit data:

```bash
pnpm db:studio
```

This opens a web UI at `https://local.drizzle.studio`

---

## 📊 Common Workflows

### Workflow: Add column with default value

```typescript
// In schema.ts
export const files = pgTable('files', {
  // ... existing columns
  viewCount: integer('view_count').default(0).notNull(),
})
```

```bash
pnpm db:push
```

### Workflow: Change column type

```typescript
// Before
name: text('name').notNull(),

// After
name: varchar('name', { length: 255 }).notNull(),
```

```bash
pnpm db:push
```

⚠️ Drizzle will attempt to cast data - verify this is safe!

### Workflow: Add foreign key

```typescript
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: text('author_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
})
```

```bash
pnpm db:push
```

---

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:push` | Push schema changes directly to database (no migrations) |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to database |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |

---

## 🚀 Production Deployment

### On Vercel

Environment variables are set in Vercel dashboard:
- `DATABASE_URL` - Your Neon connection string
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `CLERK_SECRET_KEY` - Clerk secret key

### Running Migrations in Production

**Option 1: Use `db:push` in CI/CD**
```yaml
# In your deployment workflow
- run: pnpm --filter @markdown-viewer/api db:push
```

**Option 2: Run locally before deploy**
```bash
# Point to production database
DATABASE_URL=<production-url> pnpm db:push
```

---

## ⚠️ Important Notes

1. **`db:push` vs `db:generate`**
   - `db:push`: Direct schema sync, no migration files, fast iteration
   - `db:generate`: Creates migration files, safer for teams/production

2. **Breaking Changes**
   - Changing column types may fail if data can't be cast
   - Always backup production data before schema changes

3. **Relations**
   - Relations in Drizzle are TypeScript-only
   - They don't create foreign keys (use `.references()` for that)

4. **Cascade Deletes**
   - Set `onDelete: 'cascade'` in foreign keys to auto-delete related rows
   - Example: Deleting a user deletes all their files

---

## 📝 Current Schema

### Tables
1. **users** - Synced from Clerk authentication
2. **files** - User's markdown files
3. **shares** - Share links for files

### Relationships
- `users` → `files` (one-to-many, cascade delete)
- `files` → `shares` (one-to-many, cascade delete)

---

## 🆘 Troubleshooting

**Error: DATABASE_URL is not set**
```bash
# Verify .env.local exists in monorepo root
cat ../../.env.local

# Ensure it contains DATABASE_URL
```

**Error: Connection refused**
```bash
# Check Neon database is running
# Verify connection string is correct
```

**Error: Table already exists**
```bash
# Your database already has tables
# db:push will sync the schema, not recreate
```

**Schema out of sync**
```bash
# Reset database (⚠️ DELETES ALL DATA)
# 1. Drop all tables in Neon dashboard
# 2. Run: pnpm db:push
```
