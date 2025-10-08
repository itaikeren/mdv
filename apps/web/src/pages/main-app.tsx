import { useState, useEffect, useRef, useCallback } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import { Editor } from '../components/editor'
import { Preview } from '../components/preview'
import { ModeToggle } from '../components/mode-toggle'
import { ScrollToTopButton } from '../components/scroll-to-top'
import { FileSidebar } from '../components/file-sidebar'
import { ShareButton } from '../components/share-button'
import { useFiles, useCreateFile, useUpdateFile, useDeleteFile } from '../hooks/use-files'
import { loadViewMode, saveViewMode, type ViewMode } from '../utils/storage'
import type { MarkdownFile } from '@markdown-viewer/shared'
import logoSvg from '../../assets/mdv_logo.svg'

export function MainApp() {
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [localContent, setLocalContent] = useState<string>('')

  // API hooks
  const { data: files = [], isLoading } = useFiles()
  const createFile = useCreateFile()
  const updateFile = useUpdateFile()
  const deleteFile = useDeleteFile()

  const activeFile = files.find((f: MarkdownFile) => f.id === activeFileId)
  const markdown = activeFile?.content || ''

  // Debounce timer ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set first file as active when files load
  useEffect(() => {
    if (files.length > 0 && !activeFileId) {
      setActiveFileId(files[0].id)
    }
  }, [files, activeFileId])

  // Save view mode whenever it changes
  useEffect(() => {
    saveViewMode(viewMode)
  }, [viewMode])

  // Sync local content with active file
  useEffect(() => {
    setLocalContent(markdown)
  }, [activeFileId, markdown])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  const handleMarkdownChange = useCallback((newContent: string) => {
    if (!activeFileId) return

    // Update local state immediately for responsive UI
    setLocalContent(newContent)

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer to update API after 500ms of no typing
    debounceTimer.current = setTimeout(() => {
      updateFile.mutate({
        id: activeFileId,
        data: { content: newContent },
      })
    }, 500)
  }, [activeFileId, updateFile])

  const handleFileCreate = () => {
    createFile.mutate(
      {
        name: `Untitled ${files.length + 1}`,
        content: '',
      },
      {
        onSuccess: (newFile) => {
          setActiveFileId(newFile.id)
          setViewMode('split')
        },
      }
    )
  }

  const handleFileDelete = (fileId: string) => {
    deleteFile.mutate(fileId, {
      onSuccess: () => {
        if (fileId === activeFileId) {
          const remainingFiles = files.filter((f: MarkdownFile) => f.id !== fileId)
          setActiveFileId(remainingFiles[0]?.id || null)
        }
      },
    })
  }

  const handleFileRename = (fileId: string, newName: string) => {
    updateFile.mutate({
      id: fileId,
      data: { name: newName },
    })
  }

  const handleFileSelect = (fileId: string) => {
    setActiveFileId(fileId)
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <img src={logoSvg} alt="Markdown Viewer Logo" className="w-20 h-auto mx-auto mb-6" />
            <h1 className="text-3xl font-medium text-slate-900 mb-2" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
              Markdown Viewer
            </h1>
            <p className="text-slate-600 mb-8">Sign in to start creating and sharing markdown files</p>
            <SignInButton mode="modal">
              <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors font-medium">
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="h-screen bg-white flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex-shrink-0 border-b border-slate-100 bg-white px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors"
                title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {activeFile && (
                <>
                  <span className="text-sm font-medium text-slate-700">{activeFile.name}</span>
                  <ShareButton fileId={activeFile.id} fileName={activeFile.name} />
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <ModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              <UserButton />
            </div>
          </header>

          {/* Main Content with Sidebar */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            {sidebarOpen && (
              <aside className="w-64 border-r border-slate-100 flex-shrink-0 overflow-y-auto">
                <FileSidebar
                  files={files}
                  activeFileId={activeFileId}
                  onFileSelect={handleFileSelect}
                  onFileCreate={handleFileCreate}
                  onFileDelete={handleFileDelete}
                  onFileRename={handleFileRename}
                />
              </aside>
            )}

            {/* Editor/Preview Area */}
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50/30">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-slate-400">Loading...</div>
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-slate-400 mb-4">No files yet</p>
                    <button
                      onClick={handleFileCreate}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Create your first file
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {viewMode === 'split' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full max-w-7xl mx-auto">
                      <div className="h-full min-h-96">
                        <Editor value={localContent} onChange={handleMarkdownChange} />
                      </div>
                      <div className="h-full min-h-96">
                        <Preview markdown={localContent} />
                      </div>
                    </div>
                  )}

                  {viewMode === 'edit' && (
                    <div className="max-w-6xl mx-auto h-full">
                      <Editor value={localContent} onChange={handleMarkdownChange} />
                    </div>
                  )}

                  {viewMode === 'preview' && (
                    <div className="max-w-5xl mx-auto h-full">
                      <Preview markdown={localContent} />
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
  )
}
