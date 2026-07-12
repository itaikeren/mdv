// File metadata without content - used for file lists to keep payloads small
export interface MarkdownFileMeta {
  id: string
  userId: string
  name: string
  slug: string | null
  visibility: "private" | "public"
  createdAt: Date
  updatedAt: Date
}

export interface MarkdownFile extends MarkdownFileMeta {
  content: string
}

// The file shape returned by the public share GET (/api/shares/:token).
// Deliberately omits the owner's raw Clerk user ID — public responses never
// carry it (ownership affordances come from server-computed booleans instead).
export interface SharedFile {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
  slug: string | null
  visibility: "private" | "public"
}

export interface Share {
  id: string
  fileId: string
  shareToken: string
  commentsEnabled: boolean
  allowAnonymousComments: boolean
  createdAt: Date
  expiresAt: Date | null
  viewCount: number
}

// Public-facing comment projection served by the share pages. No raw Clerk
// user ID on the wire: `userEmail` is a display-safe author string, and
// `isAnonymous` / `canDelete` are computed server-side per viewer.
export interface PublicComment {
  id: string
  shareId: string
  content: string
  parentId: string | null
  anchorStartLine: number | null
  anchorEndLine: number | null
  anchorText: string | null
  createdAt: Date
  userEmail: string
  isOutdated: boolean
  isAnonymous: boolean
  canDelete: boolean
}

// Response body of the public comments GET (/api/comments/:shareId).
export interface ShareCommentsResponse {
  comments: PublicComment[]
  viewerIsFileOwner: boolean
}

export interface CreateCommentInput {
  shareId: string
  content: string
  parentId?: string
  authorName?: string
  anchorStartLine?: number
  anchorEndLine?: number
}

export interface User {
  id: string
  email: string
  username: string | null
  createdAt: Date
}

export interface CreateFileInput {
  name: string
  content: string
}

export interface UpdateFileInput {
  name?: string
  content?: string
  slug?: string
  visibility?: "private" | "public"
}

export interface CreateShareInput {
  fileId: string
  expiresAt?: Date
  commentsEnabled?: boolean
  allowAnonymousComments?: boolean
}

export interface ShareResponse {
  shareUrl: string
  shareToken: string
}

// API key metadata; the key hash and plaintext are never exposed here.
export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: Date
  lastUsedAt: Date | null
}

export interface CreateApiKeyInput {
  name: string
}

// The plaintext `key` is returned exactly once, at creation time.
export interface CreateApiKeyResponse {
  key: string
  apiKey: ApiKey
}

// Public profile (/u/:username): username + metadata for their public files.
export interface PublicFileMeta {
  id: string
  name: string
  slug: string
  updatedAt: Date
}

export interface PublicProfile {
  username: string
  files: PublicFileMeta[]
}

// Full public file (/u/:username/:slug) - content included, no auth required.
export interface PublicFile extends PublicFileMeta {
  content: string
  authorUsername: string
}
