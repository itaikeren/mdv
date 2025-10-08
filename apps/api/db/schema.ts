import { pgTable, text, timestamp, uuid, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const files = pgTable('files', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const shares = pgTable('shares', {
  id: uuid('id').defaultRandom().primaryKey(),
  fileId: uuid('file_id').references(() => files.id, { onDelete: 'cascade' }).notNull(),
  shareToken: text('share_token').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  viewCount: integer('view_count').default(0).notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
}))

export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  shares: many(shares),
}))

export const sharesRelations = relations(shares, ({ one }) => ({
  file: one(files, {
    fields: [shares.fileId],
    references: [files.id],
  }),
}))
