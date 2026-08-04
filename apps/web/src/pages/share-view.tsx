import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useShareByToken } from "../hooks/use-shares";
import { useComments } from "../hooks/use-comments";
import { Preview } from "../components/preview";
import { CommentsSection } from "../components/comments-section";
import type { CommentAnchor } from "../components/comments-section";
import { BlockCommentMarkers } from "../components/block-comment-markers";
import { ThemeToggle } from "../components/theme-toggle";
import { GithubTextLink } from "../components/github-link";

export function ShareView() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useShareByToken(token!);
  const { isSignedIn } = useAuth();
  const [pendingAnchor, setPendingAnchor] = useState<CommentAnchor | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const previewWrapRef = useRef<HTMLDivElement>(null);

  const shareId = data?.shareId ?? "";
  // Fetched unconditionally (matching CommentsSection) so margin markers appear
  // for existing anchored comments even when commenting is now closed; the
  // shared React Query key dedupes this into a single request.
  const { data: commentsData } = useComments(shareId, true);
  // Stable reference so BlockCommentMarkers' memoized measurement only reruns
  // when the comments actually change.
  const comments = useMemo(() => commentsData?.comments ?? [], [commentsData]);

  // The block hover affordance is pointer-only; hide it below lg where the
  // left-margin positioning is cramped (comments still work via the compose box).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleCommentOnBlock = useCallback((startLine: number, endLine: number) => {
    setPendingAnchor({ startLine, endLine });
    requestAnimationFrame(() => {
      document
        .getElementById("mdv-compose")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

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
            share not found
          </h1>
          <p className="text-xs mb-6" style={{ color: "var(--term-text-muted)" }}>
            // this share link may have expired or been deleted
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

  const { file, viewCount, commentsEnabled, allowAnonymousComments, authorUsername } = data;
  const canCompose = commentsEnabled && (isSignedIn || allowAnonymousComments);
  const showAffordance = canCompose && isLargeScreen;

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
              <div className="min-w-0">
                <h1
                  className="text-xs md:text-sm font-medium truncate"
                  style={{ color: "var(--term-text-bright)" }}
                >
                  {file.name}
                </h1>
                <p className="text-[10px] truncate" style={{ color: "var(--term-text-muted)" }}>
                  {viewCount} views
                  {authorUsername && (
                    <>
                      {" "}
                      &middot;{" "}
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
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              <a
                href={`/raw/${token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] md:text-xs transition-colors whitespace-nowrap"
                style={{ color: "var(--term-text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--term-text-bright)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--term-text-muted)";
                }}
              >
                raw
              </a>
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div ref={previewWrapRef} style={{ position: "relative" }}>
          <Preview
            markdown={file.content}
            onCommentOnBlock={showAffordance ? handleCommentOnBlock : undefined}
          />
          <BlockCommentMarkers
            wrapRef={previewWrapRef}
            comments={comments}
            contentKey={file.content}
          />
        </div>
        <CommentsSection
          shareId={shareId}
          commentsEnabled={commentsEnabled}
          allowAnonymousComments={allowAnonymousComments}
          pendingAnchor={pendingAnchor}
          onClearAnchor={() => setPendingAnchor(null)}
        />
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
          </Link>{" "}
          <span aria-hidden="true">·</span> <GithubTextLink className="text-[10px] align-middle" />
        </p>
      </footer>
    </div>
  );
}
