import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../lib/api";
import type { ShareCommentsResponse, CreateCommentInput } from "@mdv/shared";

export function useComments(shareId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["comments", shareId],
    queryFn: () => commentsApi.getForShare(shareId),
    enabled: !!shareId && enabled,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentInput) => commentsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["comments", variables.shareId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; shareId: string }) => commentsApi.delete(id),
    onMutate: async ({ id, shareId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", shareId] });

      const previousComments = queryClient.getQueryData<ShareCommentsResponse>([
        "comments",
        shareId,
      ]);

      queryClient.setQueryData<ShareCommentsResponse>(["comments", shareId], (old) => {
        if (!old) return old;
        // Remove the comment and any replies to it
        return {
          ...old,
          comments: old.comments.filter((comment) => comment.id !== id && comment.parentId !== id),
        };
      });

      return { previousComments };
    },
    onError: (_error, { shareId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(["comments", shareId], context.previousComments);
      }
    },
  });
}
