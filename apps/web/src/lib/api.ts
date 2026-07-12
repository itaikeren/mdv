import type {
  MarkdownFile,
  MarkdownFileMeta,
  CreateFileInput,
  UpdateFileInput,
  CreateShareInput,
  CreateCommentInput,
  ShareResponse,
  Share,
  SharedFile,
  PublicComment,
  ShareCommentsResponse,
  ApiKey,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  User,
  PublicProfile,
  PublicFile,
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
  getAll: (): Promise<MarkdownFileMeta[]> => fetchWithAuth(`${API_BASE}/files`),

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
  ): Promise<{
    file: SharedFile;
    shareId: string;
    commentsEnabled: boolean;
    allowAnonymousComments: boolean;
    viewCount: number;
    authorUsername: string | null;
  }> => {
    const res = await fetch(`${API_BASE}/shares/${token}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  getForFile: (fileId: string): Promise<Share[]> =>
    fetchWithAuth(`${API_BASE}/shares/file/${fileId}`),

  update: (
    id: string,
    data: { commentsEnabled?: boolean; allowAnonymousComments?: boolean },
  ): Promise<Share> =>
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
  // Same-origin WITH credentials so a signed-in viewer's session cookie is sent
  // and the server can compute their per-comment `canDelete` / `viewerIsFileOwner`.
  getForShare: async (shareId: string): Promise<ShareCommentsResponse> => {
    const res = await fetch(`${API_BASE}/comments/${shareId}`, { credentials: "include" });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  create: (data: CreateCommentInput): Promise<PublicComment> =>
    fetchWithAuth(`${API_BASE}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/comments/${id}`, {
      method: "DELETE",
    }),
};

// API Keys API
export const apiKeysApi = {
  getAll: (): Promise<ApiKey[]> => fetchWithAuth(`${API_BASE}/keys`),

  create: (data: CreateApiKeyInput): Promise<CreateApiKeyResponse> =>
    fetchWithAuth(`${API_BASE}/keys`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ success: boolean }> =>
    fetchWithAuth(`${API_BASE}/keys/${id}`, {
      method: "DELETE",
    }),
};

// Users API (own profile - Clerk session or API key)
export const usersApi = {
  getMe: (): Promise<User> => fetchWithAuth(`${API_BASE}/users/me`),

  updateUsername: (username: string): Promise<User> =>
    fetchWithAuth(`${API_BASE}/users/me`, {
      method: "PATCH",
      body: JSON.stringify({ username }),
    }),
};

// Public API (no auth - profile pages and public files)
export const publicApi = {
  getProfile: async (username: string): Promise<PublicProfile> => {
    const res = await fetch(`${API_BASE}/u/${username}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  getFile: async (username: string, slug: string): Promise<PublicFile> => {
    const res = await fetch(`${API_BASE}/u/${username}/${slug}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
};
