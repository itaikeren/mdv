export interface MarkdownFile {
  id: string
  userId: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
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
  createdAt: Date
}

export interface CreateCommentInput {
  shareId: string
  content: string
  parentId?: string
  authorName?: string
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
