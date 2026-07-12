import { useEffect, useRef } from "react";
import { ClerkLoaded, useClerk } from "@clerk/clerk-react";

// Dev-only agent mode: consumes a Clerk sign-in ticket from ?__agent_ticket=...
// (minted by scripts/agent-login.mjs) so automated tools can sign in without
// going through the email/password/captcha flow. This module is only imported
// behind an import.meta.env.DEV guard, so it never ships in production builds.
function AgentTicketConsumer() {
  const clerk = useClerk();
  const consumedRef = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("__agent_ticket");
    if (!ticket || consumedRef.current) return;
    consumedRef.current = true;

    (async () => {
      try {
        if (clerk.user) {
          // A ticket in the URL means "become the agent user" - drop any session first
          await clerk.signOut();
        }
        const result = await clerk.client!.signIn.create({ strategy: "ticket", ticket });
        if (result.status === "complete") {
          await clerk.setActive({ session: result.createdSessionId });
          console.info("[agent-mode] signed in via sign-in ticket");
        } else {
          console.warn("[agent-mode] ticket sign-in incomplete:", result.status);
        }
      } catch (error) {
        console.error("[agent-mode] ticket sign-in failed:", error);
      } finally {
        // Remove the ticket from the URL so reloads don't retry a used token
        params.delete("__agent_ticket");
        const query = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (query ? `?${query}` : ""));
      }
    })();
  }, [clerk]);

  return null;
}

export default function DevAgentAuth() {
  return (
    <ClerkLoaded>
      <AgentTicketConsumer />
    </ClerkLoaded>
  );
}
