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
  createdAt: Date
  expiresAt: Date | null
  viewCount: number
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
}

export interface ShareResponse {
  shareUrl: string
  shareToken: string
}
