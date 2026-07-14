const STORAGE_KEY_FILES = "mdv-files";
const STORAGE_KEY_ACTIVE = "mdv-active";
const STORAGE_KEY_VIEW_MODE = "mdv-view-mode";
const STORAGE_KEY_SYNC_SCROLL = "mdv-sync-scroll";
const LEGACY_STORAGE_KEY = "mdv-content";

export type ViewMode = "split" | "edit" | "preview";

export interface MarkdownFile {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  files: MarkdownFile[];
  activeFileId: string | null;
}

export function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createNewFile(name: string = "Untitled", content: string = ""): MarkdownFile {
  const now = Date.now();
  return {
    id: generateFileId(),
    name,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

export function saveFiles(files: MarkdownFile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
  } catch (error) {
    console.warn("Failed to save files to localStorage:", error);
  }
}

export function loadFiles(): MarkdownFile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FILES);
    if (!data) return [];
    return JSON.parse(data) as MarkdownFile[];
  } catch (error) {
    console.warn("Failed to load files from localStorage:", error);
    return [];
  }
}

export function saveActiveFileId(fileId: string | null): void {
  try {
    if (fileId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, fileId);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE);
    }
  } catch (error) {
    console.warn("Failed to save active file ID to localStorage:", error);
  }
}

export function loadActiveFileId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE);
  } catch (error) {
    console.warn("Failed to load active file ID from localStorage:", error);
    return null;
  }
}

export function loadAppState(): AppState {
  return {
    files: loadFiles(),
    activeFileId: loadActiveFileId(),
  };
}

export function saveAppState(state: AppState): void {
  saveFiles(state.files);
  saveActiveFileId(state.activeFileId);
}

// Migration: Convert old single-file storage to new multi-file format
export function migrateLegacyStorage(): MarkdownFile | null {
  try {
    const legacyContent = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyContent) {
      // Remove the old key
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      // Create a new file from the legacy content
      return createNewFile("Imported Document", legacyContent);
    }
    return null;
  } catch (error) {
    console.warn("Failed to migrate legacy storage:", error);
    return null;
  }
}

export function saveViewMode(mode: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
  } catch (error) {
    console.warn("Failed to save view mode to localStorage:", error);
  }
}

export function loadViewMode(): ViewMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
    if (mode === "split" || mode === "edit" || mode === "preview") {
      return mode;
    }
    return "split"; // default
  } catch (error) {
    console.warn("Failed to load view mode from localStorage:", error);
    return "split";
  }
}

export function saveSyncScroll(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SYNC_SCROLL, String(enabled));
  } catch (error) {
    console.warn("Failed to save sync scroll to localStorage:", error);
  }
}

export function loadSyncScroll(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SYNC_SCROLL) !== "false"; // default on
  } catch (error) {
    console.warn("Failed to load sync scroll from localStorage:", error);
    return true;
  }
}
