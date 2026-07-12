import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  // Claimed handle for public profiles (/u/:username); nullable until claimed.
  username: text("username").unique(),
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
    // Per-user URL segment for the public profile page (/u/:username/:slug).
    // Nullable until the file is first published publicly.
    slug: text("slug"),
    // Token-based sharing (the `shares` table) stays orthogonal to this.
    visibility: text("visibility").default("private").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("files_user_id_idx").on(table.userId),
    uniqueIndex("files_user_slug_idx").on(table.userId, table.slug),
  ],
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

// Fixed-window rate limiting (see lib/rate-limit.ts). Anti-abuse, not a
// security boundary — the helper fails open on any DB error.
export const rateLimits = pgTable("rate_limits", {
  // Opaque "{name}:{id}:{bucket}" key — NEVER parsed back apart (ids may
  // contain ':', e.g. IPv6 addresses).
  key: text("key").primaryKey(),
  count: integer("count").default(1).notNull(),
  // Window end; the helper sets this explicitly on insert (no default, so a
  // missing value fails loudly instead of silently disabling limiting).
  expiresAt: timestamp("expires_at").notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    // sha256 hex of the full key; the plaintext is shown only once at creation
    keyHash: text("key_hash").unique().notNull(),
    // First 12 chars of the key (e.g. "mdv_a1b2c3d4") for display only
    keyPrefix: text("key_prefix").notNull(),
    // Authority level: "docs" (document/share/comment ops — what the MCP tools
    // do) or "full" (also account-shaping REST: username claim, public
    // publishing). Default "full" so pre-scope rows are grandfathered; the route
    // sets "docs" explicitly for newly created keys.
    scope: text("scope").default("full").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [index("api_keys_user_id_idx").on(table.userId)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  apiKeys: many(apiKeys),
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

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
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
