import { useParams, Link } from "react-router-dom";
import { usePublicProfile } from "../hooks/use-profile";
import { ThemeToggle } from "../components/theme-toggle";

export function ProfileView() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading, error } = usePublicProfile(username);

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
            profile not found
          </h1>
          <p className="text-xs mb-6" style={{ color: "var(--term-text-muted)" }}>
            // this username hasn&apos;t been claimed, or has no public files
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

  const { username: resolvedUsername, files } = data;

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
        <div className="max-w-5xl mx-auto px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs" style={{ color: "var(--term-green)" }}>
                  ~
                </span>
                <span className="font-pixel text-sm" style={{ color: "var(--term-text-bright)" }}>
                  mdv
                </span>
              </Link>
              <span className="flex-shrink-0" style={{ color: "var(--term-border)" }}>
                /
              </span>
              <span className="text-xs md:text-sm truncate" style={{ color: "var(--term-text-muted)" }}>
                @{resolvedUsername}
              </span>
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

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12 md:py-16">
        {/* Profile hero */}
        <div className="mb-10">
          <p className="text-xs mb-3" style={{ color: "var(--term-text-muted)" }}>
            <span style={{ color: "var(--term-green)" }}>//</span> public profile
          </p>
          <h1
            className="mb-2"
            style={{
              color: "var(--term-text-bright)",
              fontSize: "clamp(1.6rem, 1.2rem + 1.4vw, 2.1rem)",
              fontWeight: 680,
              letterSpacing: "-0.03em",
            }}
          >
            @{resolvedUsername}
          </h1>
          <p className="text-xs" style={{ color: "var(--term-text-muted)" }}>
            {files.length} public {files.length === 1 ? "document" : "documents"}
          </p>
        </div>

        {files.length === 0 ? (
          <div
            className="py-16 text-center"
            style={{ border: "1px solid var(--term-border)", backgroundColor: "var(--term-bg-raised)" }}
          >
            <p className="text-sm mb-1" style={{ color: "var(--term-text-bright)" }}>
              nothing published yet
            </p>
            <p className="text-xs" style={{ color: "var(--term-text-muted)" }}>
              // @{resolvedUsername} hasn&apos;t made any documents public
            </p>
          </div>
        ) : (
          <ul style={{ border: "1px solid var(--term-border)" }}>
            {files.map((file, i) => (
              <li key={file.id}>
                <Link
                  to={`/u/${resolvedUsername}/${file.slug}`}
                  className="group flex items-center gap-4 px-4 py-3.5 transition-colors"
                  style={{
                    backgroundColor: "var(--term-bg-raised)",
                    borderTop: i === 0 ? "none" : "1px solid var(--term-border)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--term-bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--term-bg-raised)";
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-sans text-sm font-medium truncate"
                      style={{ color: "var(--term-text-bright)" }}
                    >
                      {file.name}
                    </p>
                    <p className="text-[10px] mt-1 truncate" style={{ color: "var(--term-text-muted)" }}>
                      <span style={{ color: "var(--term-green)" }}>
                        /u/{resolvedUsername}/{file.slug}
                      </span>{" "}
                      &middot; updated {new Date(file.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--term-text-muted)" }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
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
