import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, publicApi } from "../lib/api";

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.getMe(),
    enabled,
  });
}

export function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username: string) => usersApi.updateUsername(username),
    onSuccess: (user) => {
      queryClient.setQueryData(["users", "me"], user);
    },
  });
}

// Public profile (/u/:username) - no auth, viewable by anyone.
export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["public", "profile", username],
    queryFn: () => publicApi.getProfile(username!),
    enabled: !!username,
  });
}
