// File metadata without content - used for file lists to keep payloads small
export interface MarkdownFileMeta {
  id: string
  userId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface MarkdownFile extends MarkdownFileMeta {
  content: string
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

export interface Comment {
  id: string
  shareId: string
  userId: string | null
  userEmail: string
  content: string
  parentId: string | null
  anchorStartLine: number | null
  anchorEndLine: number | null
  anchorText: string | null
  createdAt: Date
  isOutdated?: boolean
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
  createdAt: Date
}

export interface CreateFileInput {
  name: string
  content: string
}

export interface UpdateFileInput {
  name?: string
  content?: string
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
