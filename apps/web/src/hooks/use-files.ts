import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { filesApi } from '../lib/api'
import type { CreateFileInput, UpdateFileInput } from '@markdown-viewer/shared'

export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: filesApi.getAll,
  })
}

export function useFile(id: string | null) {
  return useQuery({
    queryKey: ['files', id],
    queryFn: () => filesApi.getOne(id!),
    enabled: !!id,
  })
}

export function useCreateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateFileInput) => filesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export function useUpdateFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFileInput }) =>
      filesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['files', variables.id] })
    },
  })
}

export function useDeleteFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}
