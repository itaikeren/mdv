import React, { useState, useCallback, memo } from "react";
import type { MarkdownFile } from "@markdown-viewer/shared";
import { TermButton } from "./term-button";

interface FileSidebarProps {
  files: MarkdownFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileCreate: () => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileImport?: () => void;
}

export const FileSidebar = memo(function FileSidebar({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFileImport,
}: FileSidebarProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleStartEdit = useCallback((file: MarkdownFile) => {
    setEditingFileId(file.id);
    setEditingName(file.name);
  }, []);

  const handleSaveEdit = useCallback(
    (fileId: string) => {
      if (editingName.trim()) {
        onFileRename(fileId, editingName.trim());
      }
      setEditingFileId(null);
      setEditingName("");
    },
    [editingName, onFileRename],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingFileId(null);
    setEditingName("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, fileId: string) => {
      if (e.key === "Enter") {
        handleSaveEdit(fileId);
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: "var(--term-bg)" }}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 md:p-3">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-medium" style={{ color: "var(--term-green)" }}>
            ~
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--term-text-bright)" }}>
            mdv
          </span>
        </div>
        <div className="flex gap-1.5">
          <TermButton onClick={onFileCreate} fullWidth className="text-left">
            + new_file
          </TermButton>
          {onFileImport && (
            <button
              onClick={onFileImport}
              className="p-1.5 transition-colors cursor-pointer flex-shrink-0"
              title="Import .md file"
              style={{ color: "var(--term-text)", border: "1px solid var(--term-border)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--term-text-bright)";
                e.currentTarget.style.borderColor = "var(--term-green)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--term-text)";
                e.currentTarget.style.borderColor = "var(--term-border)";
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 20V8m0 0l-4 4m4-4l4 4M4 6h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-2 md:px-2">
        {files.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
              // empty
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className="group relative cursor-pointer"
              >
                {editingFileId === file.id ? (
                  <div className="p-1.5">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, file.id)}
                      onBlur={() => handleSaveEdit(file.id)}
                      className="w-full px-2 py-1 text-xs outline-none"
                      style={{
                        backgroundColor: "var(--term-bg-surface)",
                        color: "var(--term-text-bright)",
                        border: "1px solid var(--term-green)",
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1.5 px-2 py-1.5 md:py-1 transition-colors"
                    style={{
                      backgroundColor:
                        activeFileId === file.id ? "var(--term-bg-surface)" : "transparent",
                      borderLeft:
                        activeFileId === file.id
                          ? "2px solid var(--term-green)"
                          : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (activeFileId !== file.id) {
                        e.currentTarget.style.backgroundColor = "var(--term-bg-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeFileId !== file.id) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <button
                      onClick={() => onFileSelect(file.id)}
                      className="flex-1 text-left truncate text-xs"
                      style={{
                        color:
                          activeFileId === file.id ? "var(--term-text-bright)" : "var(--term-text)",
                      }}
                    >
                      <span className="truncate block">{file.name}</span>
                    </button>

                    {/* Actions */}
                    <div
                      className={`flex items-center gap-0.5 flex-shrink-0 ${activeFileId === file.id ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"}`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(file);
                        }}
                        className="p-1 transition-colors"
                        title="Rename file"
                        type="button"
                        style={{ color: "var(--term-text)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--term-text-bright)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--term-text)";
                        }}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${file.name}"?`)) {
                            onFileDelete(file.id);
                          }
                        }}
                        className="p-1 transition-colors"
                        title="Delete file"
                        type="button"
                        style={{ color: "var(--term-text)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--term-red)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--term-text)";
                        }}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
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

      {/* Footer */}
      <div
        className="flex-shrink-0 p-3 text-[10px] text-center"
        style={{ color: "var(--term-text-muted)" }}
      >
        {files.length} {files.length === 1 ? "file" : "files"}
      </div>
    </div>
  );
});
