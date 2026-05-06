import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sharesApi } from "../lib/api";
import type { CreateShareInput } from "@markdown-viewer/shared";

export function useCreateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShareInput) => sharesApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shares", "file", variables.fileId] });
    },
  });
}

export function useShareByToken(token: string) {
  return useQuery({
    queryKey: ["shares", "token", token],
    queryFn: () => sharesApi.getByToken(token),
    enabled: !!token,
  });
}

export function useFileShares(fileId: string | null) {
  return useQuery({
    queryKey: ["shares", "file", fileId],
    queryFn: () => sharesApi.getForFile(fileId!),
    enabled: !!fileId,
  });
}

export function useUpdateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { commentsEnabled?: boolean; allowAnonymousComments?: boolean };
    }) => sharesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
}

export function useDeleteShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => sharesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });
}
