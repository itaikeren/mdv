import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

// Route-level code splitting: visitors of a shared link never download the
// editor app, and editor users never download the share view
const MainApp = lazy(() => import("./pages/main-app").then((m) => ({ default: m.MainApp })));
const Landing = lazy(() => import("./pages/landing").then((m) => ({ default: m.Landing })));
const ShareView = lazy(() => import("./pages/share-view").then((m) => ({ default: m.ShareView })));
const ProfileView = lazy(() =>
  import("./pages/profile-view").then((m) => ({ default: m.ProfileView })),
);
const PublicFileView = lazy(() =>
  import("./pages/public-file-view").then((m) => ({ default: m.PublicFileView })),
);

function RouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--term-bg)" }}
    >
      <span className="text-xs" style={{ color: "var(--term-text-muted)" }}>
        loading...
      </span>
    </div>
  );
}

// Signed-out visitors get the marketing homepage, signed-in users the editor.
// Split into separate chunks so neither audience downloads the other's page.
function HomeGate() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <RouteFallback />;
  return isSignedIn ? <MainApp /> : <Landing />;
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/share/:token" element={<ShareView />} />
        <Route path="/u/:username" element={<ProfileView />} />
        <Route path="/u/:username/:slug" element={<PublicFileView />} />
      </Routes>
    </Suspense>
  );
}

export default App;
