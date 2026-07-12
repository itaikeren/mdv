import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { ThemeProvider } from "./components/theme-provider";
import App from "./App.tsx";
import "./styles.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// Dev-only performance overlay; the dynamic import keeps it out of the production bundle
if (import.meta.env.DEV) {
  const { scan } = await import("react-scan");
  scan({ enabled: true });
}

// Dev-only agent mode (see scripts/agent-login.mjs); tree-shaken from production builds
const DevAgentAuth = import.meta.env.DEV ? lazy(() => import("./dev/agent-auth")) : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        {DevAgentAuth && (
          <Suspense fallback={null}>
            <DevAgentAuth />
          </Suspense>
        )}
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>,
);
