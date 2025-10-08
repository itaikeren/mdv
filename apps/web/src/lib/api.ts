import type {
  MarkdownFile,
  CreateFileInput,
  UpdateFileInput,
  CreateShareInput,
  ShareResponse,
  Share
} from '@markdown-viewer/shared'

const API_BASE = '/api'

async function fetchWithAuth(url: string, options: Parameters<typeof fetch>[1] = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// File API
export const filesApi = {
  getAll: (): Promise<MarkdownFile[]> =>
    fetchWithAuth(`${API_BASE}/files`),

  getOne: (id: string): Promise<MarkdownFile> =>
    fetchWithAuth(`${API_BASE}/files/${id}`),

  create: (data: CreateFileInput): Promise<MarkdownFile> =>
    fetchWithAuth(`${API_BASE}/files`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateFileInput): Promise<MarkdownFile> =>
    fetchWithAuth(`${API_BASE}/files/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/files/${id}`, {
      method: 'DELETE',
    }),
}

// Share API
export const sharesApi = {
  create: (data: CreateShareInput): Promise<ShareResponse & { share: Share }> =>
    fetchWithAuth(`${API_BASE}/shares`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getByToken: (token: string): Promise<{ file: MarkdownFile; viewCount: number }> =>
    fetch(`${API_BASE}/shares/${token}`).then(res => res.json()),

  getForFile: (fileId: string): Promise<Share[]> =>
    fetchWithAuth(`${API_BASE}/shares/file/${fileId}`),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/shares/${id}`, {
      method: 'DELETE',
    }),
}
