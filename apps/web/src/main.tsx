import { StrictMode, Suspense, lazy, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { ThemeProvider } from "./components/theme-provider";
import { useTheme } from "./hooks/use-theme";
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

// Clerk's popovers/modals follow the app theme: dark base in dark mode, and the
// brand green / boxy corners / mono font applied via appearance variables.
function ClerkWithTheme({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "var(--term-green)",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-mono)",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ClerkWithTheme>
          {DevAgentAuth && (
            <Suspense fallback={null}>
              <DevAgentAuth />
            </Suspense>
          )}
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </ClerkWithTheme>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
