import { useState, useMemo } from "react";
import { useAuth, SignInButton } from "@clerk/clerk-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useComments, useCreateComment, useDeleteComment } from "../hooks/use-comments";
import { useTheme } from "../hooks/use-theme";
import type { Comment } from "@markdown-viewer/shared";

interface CommentsSectionProps {
  shareId: string;
  fileOwnerId: string;
  commentsEnabled: boolean;
}

const AUTHOR_COLORS_DARK = [
  "#3fb950", // green
  "#58a6ff", // blue
  "#d2a8ff", // purple
  "#f78166", // orange
  "#7ee787", // light green
  "#79c0ff", // light blue
  "#ff7b72", // red
  "#d29922", // amber
  "#a5d6ff", // sky
  "#ffa657", // peach
  "#bc8cff", // violet
  "#56d364", // mint
  "#e3b341", // gold
  "#f0883e", // tangerine
  "#db61a2", // pink
  "#76e3ea", // cyan
  "#b392f0", // lavender
  "#fddf68", // yellow
] as const;

const AUTHOR_COLORS_LIGHT = [
  "#1a7f37", // green
  "#0550ae", // blue
  "#7c3aed", // purple
  "#bc4c00", // orange
  "#116329", // deep green
  "#0969da", // deep blue
  "#cf222e", // red
  "#9a6700", // amber
  "#0c4a8a", // navy
  "#953800", // burnt orange
  "#7e22ce", // deep violet
  "#0e6a3e", // emerald
  "#845309", // dark gold
  "#b35900", // tangerine
  "#a3195b", // pink
  "#0e6c81", // teal
  "#6639ba", // deep lavender
  "#7c5e00", // olive
] as const;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAuthorColor(email: string, theme: "dark" | "light"): string {
  const palette = theme === "light" ? AUTHOR_COLORS_LIGHT : AUTHOR_COLORS_DARK;
  return palette[hashString(email) % palette.length];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;

  const d = new Date(date);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const REMARK_PLUGINS = [remarkGfm];

function CommentBody({ content }: { content: string }) {
  return (
    <div className="comment-body" style={{ fontSize: "0.75rem", lineHeight: 1.65, color: "var(--term-text)" }}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          p: ({ children }) => <p style={{ margin: 0 }}>{children}</p>,
          code: ({ children }) => (
            <code
              style={{
                background: "var(--term-bg-surface)",
                padding: "0.1rem 0.35rem",
                fontSize: "0.6875rem",
                color: "var(--term-green)",
              }}
            >
              {children}
            </code>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--term-text-bright)", fontWeight: 700 }}>{children}</strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--term-green)", textDecoration: "underline" }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const REPLY_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 11, height: 11 }}
  >
    <polyline points="15 10 20 15 15 20" />
    <path d="M4 4v7a4 4 0 0 0 4 4h12" />
  </svg>
);

function CommentItem({
  comment,
  isFileOwner,
  currentUserId,
  shareId,
  isReply,
  parentAuthor,
  onReply,
  theme,
}: {
  comment: Comment;
  isFileOwner: boolean;
  currentUserId: string | null | undefined;
  shareId: string;
  isReply: boolean;
  parentAuthor?: string;
  onReply: (parentId: string) => void;
  theme: "dark" | "light";
}) {
  const deleteComment = useDeleteComment();
  const canDelete = currentUserId === comment.userId || isFileOwner;

  const handleDelete = () => {
    if (confirm("Delete this comment?")) {
      deleteComment.mutate({ id: comment.id, shareId });
    }
  };

  return (
    <div>
      {isReply && parentAuthor && (
        <div
          style={{
            fontSize: 10,
            color: "var(--term-text-muted)",
            opacity: 0.5,
            marginBottom: "0.15rem",
          }}
        >
          {">"} replying to {parentAuthor}
        </div>
      )}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: getAuthorColor(comment.userEmail, theme),
          }}
        >
          {comment.userEmail}
        </span>
        <span style={{ fontSize: 10, color: "var(--term-text-muted)", opacity: 0.7 }}>
          {formatRelativeTime(comment.createdAt)}
        </span>
      </div>
      <CommentBody content={comment.content} />
      <div className="flex items-center gap-3" style={{ marginTop: "0.4rem" }}>
        {!isReply && currentUserId && (
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center gap-1 cursor-pointer"
            style={{
              fontSize: 10,
              color: "var(--term-text-muted)",
              background: "none",
              border: "none",
              opacity: 0.55,
              padding: 0,
              fontFamily: "inherit",
              transition: "opacity 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.color = "var(--term-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.55";
              e.currentTarget.style.color = "var(--term-text-muted)";
            }}
          >
            {REPLY_ICON}
            reply
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 cursor-pointer"
            style={{
              fontSize: 10,
              color: "var(--term-text-muted)",
              background: "none",
              border: "none",
              opacity: 0.55,
              padding: 0,
              fontFamily: "inherit",
              transition: "opacity 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.color = "var(--term-red)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.55";
              e.currentTarget.style.color = "var(--term-text-muted)";
            }}
          >
            del
          </button>
        )}
      </div>
    </div>
  );
}

function ComposeBox({
  shareId,
  parentId,
  onCancel,
}: {
  shareId: string;
  parentId?: string;
  onCancel?: () => void;
}) {
  const [content, setContent] = useState("");
  const createComment = useCreateComment();

  const handleSubmit = () => {
    if (!content.trim()) return;

    createComment.mutate(
      {
        shareId,
        content: content.trim(),
        parentId,
      },
      {
        onSuccess: () => {
          setContent("");
          onCancel?.();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
  };

  return (
    <div
      style={{
        backgroundColor: "var(--term-bg-raised)",
        border: "1px solid var(--term-border)",
        padding: "0.75rem",
        transition: "border-color 0.15s",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--term-border-focus)";
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.style.borderColor = "var(--term-border)";
        }
      }}
    >
      <div
        className="flex items-center gap-1"
        style={{ fontSize: 10, color: "var(--term-text-muted)", marginBottom: "0.5rem" }}
      >
        <span style={{ color: "var(--term-green)" }}>$</span>
        {parentId ? "reply" : "add_comment"}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="write something..."
        maxLength={2000}
        rows={2}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          color: "var(--term-text)",
          fontFamily: "inherit",
          fontSize: "0.75rem",
          lineHeight: 1.6,
          resize: "vertical",
          minHeight: "3.5rem",
          outline: "none",
        }}
      />
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: "0.5rem",
          paddingTop: "0.5rem",
          borderTop: "1px solid var(--term-border)",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--term-text-muted)", opacity: 0.6 }}>
          supports markdown &middot;{" "}
          <kbd
            style={{
              background: "var(--term-bg-surface)",
              padding: "0.1rem 0.3rem",
              fontSize: 9,
              fontFamily: "inherit",
              border: "1px solid var(--term-border)",
            }}
          >
            ctrl+enter
          </kbd>{" "}
          to post
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="cursor-pointer"
              style={{
                fontSize: 10,
                color: "var(--term-text-muted)",
                background: "none",
                border: "none",
                fontFamily: "inherit",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--term-text-bright)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--term-text-muted)";
              }}
            >
              cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || createComment.isPending}
            className="cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              padding: "0.3rem 0.75rem",
              fontSize: 10,
              fontWeight: 500,
              background: "var(--term-btn-bg)",
              color: "var(--term-btn-text)",
              border: "none",
              fontFamily: "inherit",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
            }}
          >
            {createComment.isPending ? "posting..." : "post"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentsSection({ shareId, fileOwnerId, commentsEnabled }: CommentsSectionProps) {
  const { userId, isSignedIn } = useAuth();
  const { theme } = useTheme();
  const { data: comments = [], isLoading } = useComments(shareId, true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const isFileOwner = userId === fileOwnerId;

  // Group comments: top-level and their replies
  const groupedComments = useMemo(() => {
    const topLevel = comments.filter((c: Comment) => c.parentId === null);
    const repliesMap = new Map<string, Comment[]>();

    for (const comment of comments) {
      if (comment.parentId) {
        const existing = repliesMap.get(comment.parentId) ?? [];
        existing.push(comment);
        repliesMap.set(comment.parentId, existing);
      }
    }

    return topLevel.map((comment: Comment) => ({
      comment,
      replies: repliesMap.get(comment.id) ?? [],
    }));
  }, [comments]);

  // If comments are disabled and there are no existing comments, don't render anything
  if (!commentsEnabled && !isLoading && comments.length === 0) {
    return null;
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <hr style={{ border: "none", borderTop: "1px solid var(--term-border)", marginBottom: "1.5rem" }} />

      {/* Header */}
      <div
        className="flex items-baseline justify-between"
        style={{ marginBottom: "1.25rem" }}
      >
        <div style={{ fontSize: "0.75rem", color: "var(--term-text-muted)", fontWeight: 400 }}>
          <span style={{ color: "var(--term-green)" }}>{"//"}  </span>
          {comments.length} comment{comments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Closed banner when comments are disabled */}
      {!commentsEnabled && (
        <div
          style={{
            border: "1px solid var(--term-border)",
            padding: "0.6rem 0.75rem",
            marginBottom: "1.5rem",
            fontSize: 10,
            color: "var(--term-text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 12, height: 12, flexShrink: 0 }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          comments are closed
        </div>
      )}

      {/* Compose box or sign-in prompt (only when comments are enabled) */}
      {commentsEnabled && (
        isSignedIn ? (
          <div style={{ marginBottom: "1.5rem" }}>
            <ComposeBox shareId={shareId} />
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "var(--term-bg-raised)",
              border: "1px solid var(--term-border)",
              padding: "1rem",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.75rem", color: "var(--term-text-muted)", marginBottom: "0.5rem" }}>
              sign in to leave a comment
            </p>
            <SignInButton mode="modal">
              <button
                className="cursor-pointer"
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: 10,
                  fontWeight: 500,
                  background: "var(--term-btn-bg)",
                  color: "var(--term-btn-text)",
                  border: "none",
                  fontFamily: "inherit",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
                }}
              >
                sign_in
              </button>
            </SignInButton>
          </div>
        )
      )}

      {/* Comments list */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.75rem", color: "var(--term-text-muted)" }}>
          loading comments...
        </div>
      ) : groupedComments.length === 0 ? (
        commentsEnabled ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", fontSize: "0.75rem", color: "var(--term-text-muted)" }}>
            {"// no comments yet"}
          </div>
        ) : null
      ) : (
        <div className="flex flex-col" style={{ gap: 0 }}>
          {groupedComments.map(({ comment, replies }, index) => (
            <div key={comment.id}>
              {/* Top-level comment */}
              <div
                style={{
                  padding: "0.75rem 0",
                  borderTop: "1px solid var(--term-border)",
                  borderBottom:
                    index === groupedComments.length - 1 && replies.length === 0
                      ? "1px solid var(--term-border)"
                      : undefined,
                }}
              >
                <CommentItem
                  comment={comment}
                  isFileOwner={isFileOwner}
                  currentUserId={commentsEnabled ? userId : null}
                  shareId={shareId}
                  isReply={false}
                  onReply={setReplyingTo}
                  theme={theme}
                />
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div
                  style={{
                    marginLeft: "1rem",
                    paddingLeft: "0.75rem",
                    borderLeft: "1px solid var(--term-border)",
                    borderBottom:
                      index === groupedComments.length - 1
                        ? "1px solid var(--term-border)"
                        : undefined,
                  }}
                >
                  {replies.map((reply: Comment, replyIndex: number) => (
                    <div
                      key={reply.id}
                      style={{
                        padding: "0.6rem 0",
                        borderTop: replyIndex > 0 ? "1px solid var(--term-border)" : undefined,
                      }}
                    >
                      <CommentItem
                        comment={reply}
                        isFileOwner={isFileOwner}
                        currentUserId={commentsEnabled ? userId : null}
                        shareId={shareId}
                        isReply
                        parentAuthor={comment.userEmail}
                        onReply={setReplyingTo}
                        theme={theme}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Reply compose box */}
              {commentsEnabled && replyingTo === comment.id && isSignedIn && (
                <div
                  style={{
                    marginLeft: "1rem",
                    paddingLeft: "0.75rem",
                    borderLeft: "1px solid var(--term-border)",
                    paddingTop: "0.5rem",
                    paddingBottom: "0.5rem",
                  }}
                >
                  <ComposeBox
                    shareId={shareId}
                    parentId={comment.id}
                    onCancel={() => setReplyingTo(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
