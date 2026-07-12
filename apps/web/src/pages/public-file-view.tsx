import { useParams, Link } from "react-router-dom";
import { usePublicFile } from "../hooks/use-public-file";
import { Preview } from "../components/preview";
import { ThemeToggle } from "../components/theme-toggle";

export function PublicFileView() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { data, isLoading, error } = usePublicFile(username, slug);

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--term-bg)" }}
      >
        <div className="text-center">
          <div className="text-xs mb-2" style={{ color: "var(--term-text-muted)" }}>
            loading...
          </div>
          <div
            className="w-4 h-4 border-b mx-auto animate-spin"
            style={{ borderColor: "var(--term-text-muted)" }}
          />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--term-bg)" }}
      >
        <div className="text-center max-w-md">
          <div
            className="text-lg font-bold mb-4 tracking-widest"
            style={{ color: "var(--term-red)" }}
          >
            ! err
          </div>
          <h1 className="text-sm font-medium mb-2" style={{ color: "var(--term-text-bright)" }}>
            file not found
          </h1>
          <p className="text-xs mb-6" style={{ color: "var(--term-text-muted)" }}>
            // this file may be private, unpublished, or never existed
          </p>
          <Link
            to="/"
            className="inline-block px-4 py-1.5 text-xs font-medium transition-colors"
            style={{
              color: "var(--term-btn-text)",
              backgroundColor: "var(--term-btn-bg)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
            }}
          >
            go_home
          </Link>
        </div>
      </div>
    );
  }

  const { name, content, updatedAt, authorUsername } = data;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--term-bg)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{
          backgroundColor: "var(--term-bg)",
          borderBottom: "1px solid var(--term-border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Link
                to="/"
                className="text-xs transition-colors flex-shrink-0"
                style={{ color: "var(--term-text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--term-text-bright)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--term-text-muted)";
                }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--term-green)" }}>
                  ~
                </span>{" "}
                mdv
              </Link>
              <span className="flex-shrink-0" style={{ color: "var(--term-border)" }}>
                /
              </span>
              <div className="min-w-0">
                <h1
                  className="text-xs md:text-sm font-medium truncate"
                  style={{ color: "var(--term-text-bright)" }}
                >
                  {name}
                </h1>
                <p className="text-[10px] truncate" style={{ color: "var(--term-text-muted)" }}>
                  updated {new Date(updatedAt).toLocaleDateString()} &middot;{" "}
                  <Link
                    to={`/u/${authorUsername}`}
                    className="transition-colors"
                    style={{ color: "var(--term-text-muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--term-text-bright)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--term-text-muted)";
                    }}
                  >
                    by @{authorUsername}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              <Link
                to="/"
                className="px-2 py-1 md:px-3 text-[10px] md:text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  color: "var(--term-btn-text)",
                  backgroundColor: "var(--term-btn-bg)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
                }}
              >
                create_yours
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Content - no comments on public profile pages (share-link feature only) */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Preview markdown={content} />
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center">
        <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
          powered by{" "}
          <Link
            to="/"
            className="transition-colors"
            style={{ color: "var(--term-text)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--term-green)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--term-text)";
            }}
          >
            mdv
          </Link>
        </p>
      </footer>
    </div>
  );
}
