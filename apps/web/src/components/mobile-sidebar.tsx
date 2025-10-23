import { memo, useCallback } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { FileSidebar } from './file-sidebar'
import type { MarkdownFile } from '@markdown-viewer/shared'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: MarkdownFile[]
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileCreate: () => void
  onFileDelete: (fileId: string) => void
  onFileRename: (fileId: string, newName: string) => void
}

export const MobileSidebar = memo(function MobileSidebar({
  open,
  onOpenChange,
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
}: MobileSidebarProps) {
  // Close sidebar when file is selected on mobile
  const handleFileSelect = useCallback((fileId: string) => {
    onFileSelect(fileId)
    onOpenChange(false)
  }, [onFileSelect, onOpenChange])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Dialog */}
        <Dialog.Popup className="fixed left-0 top-0 bottom-0 z-50 w-[85%] max-w-[320px] bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left">
          <FileSidebar
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFileCreate={onFileCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
})
