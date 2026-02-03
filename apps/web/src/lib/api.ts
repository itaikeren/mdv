import type {
  MarkdownFile,
  CreateFileInput,
  UpdateFileInput,
  CreateShareInput,
  CreateCommentInput,
  ShareResponse,
  Share,
  Comment,
} from "@markdown-viewer/shared";

const API_BASE = "/api";

async function fetchWithAuth(url: string, options: Parameters<typeof fetch>[1] = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// File API
export const filesApi = {
  getAll: (): Promise<MarkdownFile[]> => fetchWithAuth(`${API_BASE}/files`),

  getOne: (id: string): Promise<MarkdownFile> => fetchWithAuth(`${API_BASE}/files/${id}`),

  create: (data: CreateFileInput): Promise<MarkdownFile> =>
    fetchWithAuth(`${API_BASE}/files`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateFileInput): Promise<MarkdownFile> =>
    fetchWithAuth(`${API_BASE}/files/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/files/${id}`, {
      method: "DELETE",
    }),
};

// Share API
export const sharesApi = {
  create: (data: CreateShareInput): Promise<ShareResponse & { share: Share }> =>
    fetchWithAuth(`${API_BASE}/shares`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getByToken: async (
    token: string,
  ): Promise<{ file: MarkdownFile; shareId: string; commentsEnabled: boolean; viewCount: number }> => {
    const res = await fetch(`${API_BASE}/shares/${token}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  getForFile: (fileId: string): Promise<Share[]> =>
    fetchWithAuth(`${API_BASE}/shares/file/${fileId}`),

  update: (id: string, data: { commentsEnabled?: boolean }): Promise<Share> =>
    fetchWithAuth(`${API_BASE}/shares/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/shares/${id}`, {
      method: "DELETE",
    }),
};

// Comments API
export const commentsApi = {
  getForShare: async (shareId: string): Promise<Comment[]> => {
    const res = await fetch(`${API_BASE}/comments/${shareId}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  create: (data: CreateCommentInput): Promise<Comment> =>
    fetchWithAuth(`${API_BASE}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/comments/${id}`, {
      method: "DELETE",
    }),
};
