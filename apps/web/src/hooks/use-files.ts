import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filesApi } from "../lib/api";
import type { CreateFileInput, UpdateFileInput, MarkdownFile, MarkdownFileMeta } from "@mdv/shared";

// The list cache (["files"]) holds metadata only; full content lives in the
// per-file cache (["files", id]) so the app never downloads documents it isn't showing.
function toMeta(file: MarkdownFile): MarkdownFileMeta {
  return {
    id: file.id,
    userId: file.userId,
    name: file.name,
    slug: file.slug,
    visibility: file.visibility,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

export function useFiles() {
  return useQuery({
    queryKey: ["files"],
    queryFn: filesApi.getAll,
  });
}

export function useFile(id: string | null) {
  return useQuery({
    queryKey: ["files", id],
    queryFn: () => filesApi.getOne(id!),
    enabled: !!id,
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFileInput) => filesApi.create(data),
    // Keep onSuccess since we need the server's response (with ID) for create
    onSuccess: (newFile) => {
      queryClient.setQueryData<MarkdownFileMeta[]>(["files"], (oldFiles) => {
        if (!oldFiles) return [toMeta(newFile)];
        return [toMeta(newFile), ...oldFiles];
      });
      // Seed the per-file cache so opening the new file needs no fetch
      queryClient.setQueryData<MarkdownFile>(["files", newFile.id], newFile);
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileInput }) => filesApi.update(id, data),
    // onMutate for instant UI updates
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["files"] });
      await queryClient.cancelQueries({ queryKey: ["files", variables.id] });

      const previousFiles = queryClient.getQueryData<MarkdownFileMeta[]>(["files"]);
      const previousFile = queryClient.getQueryData<MarkdownFile>(["files", variables.id]);

      // Optimistically update the caches (the list only carries the name)
      if (variables.data.name !== undefined) {
        queryClient.setQueryData<MarkdownFileMeta[]>(["files"], (oldFiles) => {
          if (!oldFiles) return oldFiles;
          return oldFiles.map((file) =>
            file.id === variables.id ? { ...file, name: variables.data.name! } : file,
          );
        });
      }

      queryClient.setQueryData<MarkdownFile>(["files", variables.id], (old) => {
        if (!old) return old;
        return { ...old, ...variables.data };
      });

      return { previousFiles, previousFile };
    },
    onError: (_error, variables, context) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(["files"], context.previousFiles);
      }
      if (context?.previousFile) {
        queryClient.setQueryData(["files", variables.id], context.previousFile);
      }
    },
    // Still update with server response to ensure consistency
    onSuccess: (updatedFile, variables) => {
      queryClient.setQueryData<MarkdownFileMeta[]>(["files"], (oldFiles) => {
        if (!oldFiles) return oldFiles;
        return oldFiles.map((file) => (file.id === variables.id ? toMeta(updatedFile) : file));
      });
      queryClient.setQueryData<MarkdownFile>(["files", variables.id], updatedFile);
    },
  });
}

export function useDeleteFile(onDeleteCallback?: (deletedId: string) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    // onMutate runs BEFORE the API call - this makes the UI update instant!
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["files"] });

      // Snapshot the previous value for rollback on error
      const previousFiles = queryClient.getQueryData<MarkdownFileMeta[]>(["files"]);

      // Optimistically remove the file from cache IMMEDIATELY
      queryClient.setQueryData<MarkdownFileMeta[]>(["files"], (oldFiles) => {
        if (!oldFiles) return oldFiles;
        return oldFiles.filter((file) => file.id !== deletedId);
      });
      queryClient.removeQueries({ queryKey: ["files", deletedId] });

      // Call the callback immediately (before API completes) for instant UI updates
      if (onDeleteCallback) {
        onDeleteCallback(deletedId);
      }

      // Return context with previous value for potential rollback
      return { previousFiles };
    },
    // Rollback on error
    onError: (_error, _deletedId, context) => {
      if (context?.previousFiles) {
        queryClient.setQueryData(["files"], context.previousFiles);
      }
    },
  });
}
