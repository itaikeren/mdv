import { useQuery } from "@tanstack/react-query";
import { publicApi } from "../lib/api";

// Public file (/u/:username/:slug) - no auth, viewable by anyone.
export function usePublicFile(username: string | undefined, slug: string | undefined) {
  return useQuery({
    queryKey: ["public", "file", username, slug],
    queryFn: () => publicApi.getFile(username!, slug!),
    enabled: !!username && !!slug,
  });
}
