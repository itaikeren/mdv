import { memo, useCallback } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { FileSidebar } from "./file-sidebar";
import type { MarkdownFileMeta } from "@mdv/shared";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: MarkdownFileMeta[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileCreate: () => void;
  onFileDelete: (fileId: string) => void;
  onFileRename: (fileId: string, newName: string) => void;
  onFileImport?: () => void;
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
  onFileImport,
}: MobileSidebarProps) {
  const handleFileSelect = useCallback(
    (fileId: string) => {
      onFileSelect(fileId);
      onOpenChange(false);
    },
    [onFileSelect, onOpenChange],
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className="fixed inset-0 z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          style={{ backgroundColor: "var(--term-backdrop)" }}
        />

        <Dialog.Popup
          className="fixed left-0 top-0 bottom-0 z-50 w-[80%] max-w-[280px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
          style={{
            backgroundColor: "var(--term-bg)",
            borderRight: "1px solid var(--term-border)",
          }}
        >
          <FileSidebar
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onFileCreate={onFileCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            onFileImport={onFileImport}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
});
