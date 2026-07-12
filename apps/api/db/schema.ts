import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("files_user_id_idx").on(table.userId)],
);

export const shares = pgTable(
  "shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileId: uuid("file_id")
      .references(() => files.id, { onDelete: "cascade" })
      .notNull(),
    shareToken: text("share_token").unique().notNull(),
    commentsEnabled: boolean("comments_enabled").default(false).notNull(),
    allowAnonymousComments: boolean("allow_anonymous_comments").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at"),
    viewCount: integer("view_count").default(0).notNull(),
  },
  (table) => [index("shares_file_id_idx").on(table.fileId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shareId: uuid("share_id")
      .references(() => shares.id, { onDelete: "cascade" })
      .notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    content: text("content").notNull(),
    // Deleting a top-level comment removes its replies instead of orphaning them
    parentId: uuid("parent_id").references((): AnyPgColumn => comments.id, {
      onDelete: "cascade",
    }),
    // Line anchor (GitHub-style): static source-line range + a snapshot of the
    // anchored text at comment time. All null = regular unanchored comment.
    // "Outdated" is derived on read by comparing the snapshot to current content.
    anchorStartLine: integer("anchor_start_line"),
    anchorEndLine: integer("anchor_end_line"),
    anchorText: text("anchor_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("comments_share_id_idx").on(table.shareId)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  shares: many(shares),
}));

export const sharesRelations = relations(shares, ({ one, many }) => ({
  file: one(files, {
    fields: [shares.fileId],
    references: [files.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  share: one(shares, {
    fields: [comments.shareId],
    references: [shares.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, {
    relationName: "commentReplies",
  }),
}));
