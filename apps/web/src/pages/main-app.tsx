import { useState, useEffect, useRef, useCallback, type ChangeEvent, type MouseEvent } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { Editor } from "../components/editor";
import { Preview } from "../components/preview";
import { ModeToggle } from "../components/mode-toggle";
import { ScrollToTopButton } from "../components/scroll-to-top";
import { FileSidebar } from "../components/file-sidebar";
import { MobileSidebar } from "../components/mobile-sidebar";
import { ShareButton } from "../components/share-button";
import { ThemeToggle } from "../components/theme-toggle";
import { TermButton } from "../components/term-button";
import { useFiles, useCreateFile, useUpdateFile, useDeleteFile } from "../hooks/use-files";
import { loadViewMode, saveViewMode, type ViewMode } from "../utils/storage";
import type { MarkdownFile } from "@markdown-viewer/shared";

export function MainApp() {
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [localContent, setLocalContent] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);

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
  const { data: files = [], isLoading } = useFiles();
  const createFile = useCreateFile();
  const updateFile = useUpdateFile();

  // Memoize callback for activeFileId management
  const handleDeletedFile = useCallback(
    (deletedId: string) => {
      if (deletedId === activeFileId) {
        const remainingFiles = files.filter((f: MarkdownFile) => f.id !== deletedId);
        setActiveFileId(remainingFiles[0]?.id || null);
      }
    },
    [activeFileId, files],
  );

  const deleteFile = useDeleteFile(handleDeletedFile);

  const activeFile = files.find((f: MarkdownFile) => f.id === activeFileId);
  const markdown = activeFile?.content || "";

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

  // Sync local content with active file
  useEffect(() => {
    setLocalContent(markdown);
  }, [activeFileId, markdown]);

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

  return (
    <>
      <SignedOut>
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--term-bg)" }}
        >
          <div className="text-center">
            <pre
              className="text-xs md:text-sm mb-6 leading-tight inline-block text-left"
              style={{
                color: "var(--term-green)",
                fontFeatureSettings: '"liga" 0, "calt" 0',
              }}
            >
              {`  __  __ ____  __     __
 |  \\/  |  _ \\ \\ \\   / /
 | |\\/| | | | | \\ \\ / /
 | |  | | |_| |  \\ V /
 |_|  |_|____/    \\_/`}
            </pre>
            <h1 className="text-sm font-medium mb-1" style={{ color: "var(--term-text)" }}>
              markdown viewer
            </h1>
            <p className="text-xs mb-8" style={{ color: "var(--term-text-muted)" }}>
              // sign in to start creating and sharing markdown files
            </p>
            <SignInButton mode="modal">
              <TermButton className="px-5 py-2">sign_in</TermButton>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

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
              {activeFile && <ShareButton fileId={activeFile.id} fileName={activeFile.name} />}
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
              <ThemeToggle />
              <UserButton />
            </div>
          </header>

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
                  <div className="text-center">
                    <p className="text-xs mb-4" style={{ color: "var(--term-text-muted)" }}>
                      // no files found
                    </p>
                    <TermButton onClick={handleFileCreate}>new_file</TermButton>
                  </div>
                </div>
              ) : (
                <>
                  {viewMode === "split" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 h-full max-w-7xl mx-auto">
                      <div className="h-full min-h-64 md:min-h-96">
                        <Editor value={localContent} onChange={handleMarkdownChange} />
                      </div>
                      <div className="h-full min-h-64 md:min-h-96">
                        <Preview key="preview-stable" markdown={localContent} />
                      </div>
                    </div>
                  )}

                  {viewMode === "edit" && (
                    <div className="max-w-6xl mx-auto h-full">
                      <Editor value={localContent} onChange={handleMarkdownChange} />
                    </div>
                  )}

                  {viewMode === "preview" && (
                    <div className="max-w-5xl mx-auto h-full">
                      <Preview key="preview-stable" markdown={localContent} />
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
