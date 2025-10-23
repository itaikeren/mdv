import React, { useState, useCallback, memo } from 'react'
import type { MarkdownFile } from '@markdown-viewer/shared'
import logoSvg from '../../assets/mdv_logo.svg'

interface FileSidebarProps {
  files: MarkdownFile[]
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileCreate: () => void
  onFileDelete: (fileId: string) => void
  onFileRename: (fileId: string, newName: string) => void
}

export const FileSidebar = memo(function FileSidebar({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: FileSidebarProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleStartEdit = useCallback((file: MarkdownFile) => {
    setEditingFileId(file.id)
    setEditingName(file.name)
  }, [])

  const handleSaveEdit = useCallback((fileId: string) => {
    if (editingName.trim()) {
      onFileRename(fileId, editingName.trim())
    }
    setEditingFileId(null)
    setEditingName('')
  }, [editingName, onFileRename])

  const handleCancelEdit = useCallback(() => {
    setEditingFileId(null)
    setEditingName('')
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, fileId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(fileId)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }, [handleSaveEdit, handleCancelEdit])

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 p-3 pb-2 md:p-4 md:pb-3">
        <div className="flex items-center gap-1.5 md:gap-2 mb-4">
          <img src={logoSvg} alt="Markdown Viewer Logo" className="h-4 md:h-5 w-auto" />
          <h2 className="text-base md:text-lg font-medium text-slate-900" style={{ fontFamily: "'IBM Plex Serif', serif" }}>
            Markdown Viewer
          </h2>
        </div>
        <button
          onClick={onFileCreate}
          className="
            w-full px-4 py-2.5 bg-black text-white rounded-lg
            hover:bg-slate-800 transition-colors
            flex items-center gap-2
            text-sm font-medium
          "
        >
          <span className="text-base">+</span>
          New File
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4">
        {files.length === 0 ? (
          <div className="text-center text-slate-400 py-12 px-4">
            <p className="text-sm">No files yet</p>
            <p className="text-xs mt-1 text-slate-400">Click "New File" to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className={`
                  group relative rounded-lg
                  ${activeFileId === file.id
                    ? 'bg-white border border-slate-200'
                    : 'hover:bg-white/50'
                  }
                `}
              >
                {editingFileId === file.id ? (
                  <div className="p-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, file.id)}
                      onBlur={() => handleSaveEdit(file.id)}
                      className="
                        w-full px-2 py-1 text-sm border border-blue-500 rounded
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                      "
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 md:p-2">
                    <button
                      onClick={() => onFileSelect(file.id)}
                      className="flex-1 text-left truncate text-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg className={`w-4 h-4 flex-shrink-0 ${activeFileId === file.id ? 'text-slate-700' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className={`truncate ${activeFileId === file.id ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                          {file.name}
                        </span>
                      </div>
                    </button>

                    {/* Actions (visible on hover or when active) */}
                    <div className={`flex items-center gap-1 flex-shrink-0 ${activeFileId === file.id ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartEdit(file)
                        }}
                        className="p-2 md:p-1 hover:bg-slate-200 rounded transition-colors"
                        title="Rename file"
                        type="button"
                      >
                        <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Delete "${file.name}"?`)) {
                            onFileDelete(file.id)
                          }
                        }}
                        className="p-2 md:p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete file"
                        type="button"
                      >
                        <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with file count */}
      <div className="flex-shrink-0 p-4 text-xs text-slate-400 text-center">
        {files.length} {files.length === 1 ? 'file' : 'files'}
      </div>
    </div>
  )
})
