import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useDeferredValue,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SignedIn, UserButton } from "@clerk/clerk-react";
import { Editor } from "../components/editor";
import { Preview } from "../components/preview";
import { ModeToggle } from "../components/mode-toggle";
import { ScrollToTopButton } from "../components/scroll-to-top";
import { FileSidebar } from "../components/file-sidebar";
import { MobileSidebar } from "../components/mobile-sidebar";
import { ShareButton } from "../components/share-button";
import { ApiKeysModal } from "../components/api-keys-modal";
import { UsernameModal } from "../components/username-modal";
import { TermButton } from "../components/term-button";
import { useTheme } from "../hooks/use-theme";
import { useFiles, useFile, useCreateFile, useUpdateFile, useDeleteFile } from "../hooks/use-files";
import { useSyncScroll } from "../hooks/use-sync-scroll";
import { filesApi } from "../lib/api";
import {
  loadSyncScroll,
  loadViewMode,
  saveSyncScroll,
  saveViewMode,
  type ViewMode,
} from "../utils/storage";
import type { MarkdownFileMeta } from "@markdown-viewer/shared";

// 16px stroke icon for the Clerk user-menu items.
function MenuIcon({ d }: { d: string }) {
  return (
    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICON_PROFILE =
  "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.12a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.68 0-5.22-.58-7.5-1.63z";
const ICON_KEY =
  "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.03 5.91c-.56-.1-1.16.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.4.53-1 .43-1.56A6 6 0 1121.75 8.25z";
const ICON_SUN =
  "M12 3v2.25m6.36.39l-1.59 1.59M21 12h-2.25m-.39 6.36l-1.59-1.59M12 18.75V21m-4.77-4.23l-1.59 1.59M5.25 12H3m4.23-4.77L5.64 5.64M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z";
const ICON_MOON =
  "M21.75 15A9.72 9.72 0 0118 15.75c-5.39 0-9.75-4.37-9.75-9.75 0-1.33.27-2.6.75-3.75A9.75 9.75 0 003 11.25C3 16.64 7.37 21 12.75 21a9.75 9.75 0 009-6z";

export function MainApp() {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(() => loadSyncScroll());
  // Start closed on mobile so the sidebar dialog doesn't pop open on first load
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [localContent, setLocalContent] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  // Account actions live in the user menu; the modals are opened from there.
  const [apiKeysOpen, setApiKeysOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Detect if we're on mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // API hooks
  const queryClient = useQueryClient();
  const { data: files = [], isLoading } = useFiles();
  const createFile = useCreateFile();
  const updateFile = useUpdateFile();

  // Memoize callback for activeFileId management
  const handleDeletedFile = useCallback(
    (deletedId: string) => {
      if (deletedId === activeFileId) {
        const remainingFiles = files.filter((f: MarkdownFileMeta) => f.id !== deletedId);
        setActiveFileId(remainingFiles[0]?.id || null);
      }
    },
    [activeFileId, files],
  );

  const deleteFile = useDeleteFile(handleDeletedFile);

  const activeFile = files.find((f: MarkdownFileMeta) => f.id === activeFileId);

  // The file list only carries metadata; content is fetched (and cached) per file
  const { data: activeFileData } = useFile(activeFileId);
  const markdown = activeFileData?.content ?? "";
  const isFileContentReady = !activeFileId || activeFileData !== undefined;

  // Debounce timer refs
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Set first file as active when files load
  useEffect(() => {
    if (files.length > 0 && !activeFileId) {
      setActiveFileId(files[0].id);
    }
  }, [files, activeFileId]);

  // Save view mode whenever it changes
  useEffect(() => {
    saveViewMode(viewMode);
  }, [viewMode]);

  // Save sync scroll preference whenever it changes
  useEffect(() => {
    saveSyncScroll(syncScrollEnabled);
  }, [syncScrollEnabled]);

  // Sync local content with active file (only once its content has loaded,
  // so a pending fetch never wipes the editor)
  useEffect(() => {
    if (!activeFileId) {
      setLocalContent("");
      return;
    }
    if (isFileContentReady) {
      setLocalContent(markdown);
    }
  }, [activeFileId, markdown, isFileContentReady]);

  // Keystrokes update localContent immediately; the preview renders from the
  // deferred value so markdown parsing never blocks typing
  const deferredContent = useDeferredValue(localContent);

  // Editor/preview scroll sync (split mode on lg+ screens only). The enabled
  // flag also tracks whether the split panes are actually mounted, so the
  // hook re-binds its listeners once the editor/preview elements exist
  const editorScrollRef = useRef<HTMLTextAreaElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const splitPanesMounted =
    viewMode === "split" && !isLoading && files.length > 0 && isFileContentReady;
  useSyncScroll({
    enabled: syncScrollEnabled && splitPanesMounted,
    editorRef: editorScrollRef,
    previewRef: previewScrollRef,
    content: localContent,
  });

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (titleDebounceTimer.current) {
        clearTimeout(titleDebounceTimer.current);
      }
    };
  }, []);

  const handleMarkdownChange = useCallback(
    (newContent: string) => {
      if (!activeFileId) return;

      // Update local state immediately for responsive UI
      setLocalContent(newContent);

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer to update API after 500ms of no typing
      debounceTimer.current = setTimeout(() => {
        updateFile.mutate({
          id: activeFileId,
          data: { content: newContent },
        });
      }, 500);

      // Auto-set title from first line if the file name is "Untitled X"
      if (activeFile && activeFile.name.startsWith("Untitled ")) {
        // Clear existing title timer
        if (titleDebounceTimer.current) {
          clearTimeout(titleDebounceTimer.current);
        }

        // Set new timer to update title after 1000ms of no typing
        titleDebounceTimer.current = setTimeout(() => {
          const firstLine = newContent.split("\n")[0].trim();
          if (firstLine) {
            // Extract text from markdown (remove # symbols and other markdown syntax)
            const cleanTitle = firstLine.replace(/^#+\s*/, "").trim();
            if (cleanTitle) {
              updateFile.mutate({
                id: activeFileId,
                data: { name: cleanTitle },
              });
            }
          }
        }, 1000);
      }
    },
    [activeFileId, activeFile, updateFile],
  );

  const handleFileCreate = useCallback(() => {
    createFile.mutate(
      {
        name: `Untitled ${files.length + 1}`,
        content: "",
      },
      {
        onSuccess: (newFile) => {
          setActiveFileId(newFile.id);
          setViewMode("split");
        },
      },
    );
  }, [createFile, files.length, setViewMode]);

  const handleFileDelete = useCallback(
    (fileId: string) => {
      // No inline onSuccess - callback runs immediately in onMutate
      deleteFile.mutate(fileId);
    },
    [deleteFile],
  );

  const handleFileRename = useCallback(
    (fileId: string, newName: string) => {
      updateFile.mutate({
        id: fileId,
        data: { name: newName },
      });
    },
    [updateFile],
  );

  const handleFileSelect = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  // Prefetch file content on hover so switching files feels instant
  const handleFileHover = useCallback(
    (fileId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["files", fileId],
        queryFn: () => filesApi.getOne(fileId),
        staleTime: 60 * 1000,
      });
    },
    [queryClient],
  );

  // Download current file as .md
  const [downloadDone, setDownloadDone] = useState(false);
  const downloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDownload = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.blur();
      if (!activeFile) return;
      const blob = new Blob([localContent], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeFile.name}.md`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadDone(true);
      if (downloadTimerRef.current) clearTimeout(downloadTimerRef.current);
      downloadTimerRef.current = setTimeout(() => setDownloadDone(false), 1500);
    },
    [activeFile, localContent],
  );

  // Import .md file
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const name = file.name.replace(/\.(md|markdown|txt)$/i, "");
        createFile.mutate(
          { name, content },
          {
            onSuccess: (newFile) => {
              setActiveFileId(newFile.id);
              setViewMode("split");
            },
          },
        );
      };
      reader.readAsText(file);

      // Reset so the same file can be re-imported
      e.target.value = "";
    },
    [createFile, setViewMode],
  );

  // Signed-out visitors never reach this component — HomeGate in App.tsx
  // routes them to the landing page instead.
  return (
    <>
      <SignedIn>
        <div
          className="h-screen flex flex-col overflow-hidden"
          style={{ backgroundColor: "var(--term-bg)" }}
        >
          {/* Header */}
          <header
            className="flex-shrink-0 px-3 py-2 md:px-4 md:py-2.5 flex justify-between items-center"
            style={{ borderBottom: "1px solid var(--term-border)" }}
          >
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 transition-colors"
                title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                style={{ color: "var(--term-text)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--term-text-bright)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--term-text)";
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <span className="text-xs hidden sm:inline" style={{ color: "var(--term-text)" }}>
                {activeFile ? (
                  <span className="font-semibold" style={{ color: "var(--term-text-bright)" }}>
                    {activeFile.name}
                  </span>
                ) : (
                  "~/no-file"
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              {activeFile && (
                <span
                  aria-hidden="true"
                  className="hidden md:block w-px h-4 self-center"
                  style={{ backgroundColor: "var(--term-border)" }}
                />
              )}
              {activeFile && (
                <ShareButton
                  fileId={activeFile.id}
                  fileName={activeFile.name}
                  slug={activeFile.slug}
                  visibility={activeFile.visibility}
                />
              )}
              {activeFile && (
                <button
                  onClick={handleDownload}
                  className="p-1.5 transition-colors cursor-pointer"
                  title={downloadDone ? "Downloaded!" : "Download as .md"}
                  style={{ color: downloadDone ? "var(--term-green)" : "var(--term-text)" }}
                  onMouseEnter={(e) => {
                    if (!downloadDone) e.currentTarget.style.color = "var(--term-text-bright)";
                  }}
                  onMouseLeave={(e) => {
                    if (!downloadDone) e.currentTarget.style.color = "var(--term-text)";
                  }}
                >
                  {downloadDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16"
                      />
                    </svg>
                  )}
                </button>
              )}
              <span
                aria-hidden="true"
                className="hidden md:block w-px h-4 self-center"
                style={{ backgroundColor: "var(--term-border)" }}
              />
              <UserButton afterSignOutUrl="/">
                <UserButton.MenuItems>
                  <UserButton.Action
                    label="Public profile"
                    labelIcon={<MenuIcon d={ICON_PROFILE} />}
                    onClick={() => setUsernameOpen(true)}
                  />
                  <UserButton.Action
                    label="API keys"
                    labelIcon={<MenuIcon d={ICON_KEY} />}
                    onClick={() => setApiKeysOpen(true)}
                  />
                  <UserButton.Action
                    label={theme === "dark" ? "Light mode" : "Dark mode"}
                    labelIcon={<MenuIcon d={theme === "dark" ? ICON_SUN : ICON_MOON} />}
                    onClick={toggleTheme}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </header>

          {/* Account modals — opened from the user menu (see UserButton above) */}
          <ApiKeysModal open={apiKeysOpen} onOpenChange={setApiKeysOpen} />
          <UsernameModal open={usernameOpen} onOpenChange={setUsernameOpen} />

          {/* Mobile Sidebar (Dialog) - Only on mobile/tablet */}
          {isMobile && (
            <MobileSidebar
              open={sidebarOpen}
              onOpenChange={setSidebarOpen}
              files={files}
              activeFileId={activeFileId}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onFileRename={handleFileRename}
              onFileImport={handleImportClick}
            />
          )}

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Main Content with Sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Desktop Sidebar - Persistent on large screens */}
            {sidebarOpen && (
              <aside
                className="hidden lg:block w-56 flex-shrink-0 overflow-y-auto"
                style={{ borderRight: "1px solid var(--term-border)" }}
              >
                <FileSidebar
                  files={files}
                  activeFileId={activeFileId}
                  onFileSelect={handleFileSelect}
                  onFileHover={handleFileHover}
                  onFileCreate={handleFileCreate}
                  onFileDelete={handleFileDelete}
                  onFileRename={handleFileRename}
                  onFileImport={handleImportClick}
                />
              </aside>
            )}

            {/* Editor/Preview Area */}
            <main
              className="flex-1 p-3 md:p-4 lg:p-6 overflow-y-auto"
              style={{ backgroundColor: "var(--term-bg)" }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs" style={{ color: "var(--term-text-muted)" }}>
                    loading...
                  </span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-xs">
                    <p className="text-sm mb-1.5" style={{ color: "var(--term-text-bright)" }}>
                      no documents yet
                    </p>
                    <p
                      className="text-xs mb-5 leading-relaxed"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      // start a document or import an .md file to get going
                    </p>
                    <TermButton onClick={handleFileCreate}>+ new_file</TermButton>
                  </div>
                </div>
              ) : !isFileContentReady ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-xs" style={{ color: "var(--term-text-muted)" }}>
                    loading...
                  </span>
                </div>
              ) : (
                <>
                  {viewMode === "split" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 h-full max-w-7xl mx-auto">
                      <div className="h-full min-h-64 md:min-h-96">
                        <Editor
                          value={localContent}
                          onChange={handleMarkdownChange}
                          textareaRef={editorScrollRef}
                          syncScroll={{
                            enabled: syncScrollEnabled,
                            onToggle: () => setSyncScrollEnabled((v) => !v),
                          }}
                        />
                      </div>
                      <div className="h-full min-h-64 md:min-h-96">
                        <Preview
                          key="preview-stable"
                          markdown={deferredContent}
                          scrollRef={previewScrollRef}
                        />
                      </div>
                    </div>
                  )}

                  {viewMode === "edit" && (
                    <div className="max-w-6xl mx-auto h-full">
                      <Editor value={localContent} onChange={handleMarkdownChange} />
                    </div>
                  )}

                  {viewMode === "preview" && (
                    <div className="h-full">
                      <Preview key="preview-stable" markdown={deferredContent} />
                    </div>
                  )}
                </>
              )}
            </main>
          </div>

          {/* Scroll to Top Button */}
          <ScrollToTopButton />
        </div>
      </SignedIn>
    </>
  );
}
