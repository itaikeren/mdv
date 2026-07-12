import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Route-level code splitting: visitors of a shared link never download the
// editor app, and editor users never download the share view
const MainApp = lazy(() => import("./pages/main-app").then((m) => ({ default: m.MainApp })));
const ShareView = lazy(() => import("./pages/share-view").then((m) => ({ default: m.ShareView })));

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

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/share/:token" element={<ShareView />} />
      </Routes>
    </Suspense>
  );
}

export default App;
