import { useState, useEffect, useCallback } from "react";
import { useCreateShare, useFileShares, useDeleteShare, useUpdateShare } from "../hooks/use-shares";
import { useUpdateFile } from "../hooks/use-files";
import { useMe } from "../hooks/use-profile";
import type { Share } from "@markdown-viewer/shared";

interface ShareButtonProps {
  fileId: string;
  fileName: string;
  slug: string | null;
  visibility: "private" | "public";
}

const MAX_SLUG_LENGTH = 32;

// Cosmetic client-side mirror of apps/api/lib/slug.ts's slugify(), used only
// to prefill the slug field. The server is authoritative and re-derives /
// re-validates on save.
function slugify(name: string): string {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length > MAX_SLUG_LENGTH) {
    base = base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
  }
  if (base.length < 3) {
    base = (base || "file").padEnd(3, "0");
  }
  return base;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
      style={{
        backgroundColor: checked ? "var(--term-green)" : "var(--term-border)",
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full transition-transform"
        style={{
          backgroundColor: checked ? "var(--term-bg)" : "var(--term-text-muted)",
          transform: checked ? "translateX(14px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

export function ShareButton({ fileId, fileName, slug, visibility }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedRawToken, setCopiedRawToken] = useState<string | null>(null);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState(false);
  const [slugInput, setSlugInput] = useState(slug ?? "");
  const [visibilityDraft, setVisibilityDraft] = useState(visibility === "public");
  const [publishError, setPublishError] = useState<string | null>(null);

  const createShare = useCreateShare();
  const { data: shares = [], isLoading } = useFileShares(isOpen ? fileId : null);
  const deleteShare = useDeleteShare();
  const updateShare = useUpdateShare();
  const updateFile = useUpdateFile();
  const { data: me } = useMe(isOpen);

  // Seed the publish draft from the file's current state whenever the modal
  // opens (or the underlying file changes, e.g. right after a successful save)
  useEffect(() => {
    if (isOpen) {
      setSlugInput(slug ?? "");
      setVisibilityDraft(visibility === "public");
      setPublishError(null);
    }
  }, [isOpen, slug, visibility]);

  const handleCreateShare = () => {
    createShare.mutate({ fileId, commentsEnabled: false, allowAnonymousComments: false });
  };

  const handleToggleComments = (share: Share) => {
    updateShare.mutate({
      id: share.id,
      data: { commentsEnabled: !share.commentsEnabled },
    });
  };

  const handleToggleAnonymous = (share: Share) => {
    updateShare.mutate({
      id: share.id,
      data: { allowAnonymousComments: !share.allowAnonymousComments },
    });
  };

  const handleCopyLink = (shareUrl: string, token: string) => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyRawLink = (rawUrl: string, token: string) => {
    navigator.clipboard.writeText(rawUrl);
    setCopiedRawToken(token);
    setTimeout(() => setCopiedRawToken(null), 2000);
  };

  const handleDeleteShare = (shareId: string) => {
    if (confirm("Delete this share link?")) {
      deleteShare.mutate(shareId);
    }
  };

  const handleToggleVisibility = () => {
    const next = !visibilityDraft;
    setVisibilityDraft(next);
    if (next && !slugInput.trim()) {
      setSlugInput(slugify(fileName));
    }
  };

  const handleSavePublish = () => {
    setPublishError(null);
    const trimmedSlug = slugInput.trim();
    updateFile.mutate(
      {
        id: fileId,
        data: {
          visibility: visibilityDraft ? "public" : "private",
          ...(visibilityDraft && trimmedSlug ? { slug: trimmedSlug } : {}),
        },
      },
      {
        onError: (err) => {
          setPublishError(err instanceof Error ? err.message : "Failed to update visibility");
        },
      },
    );
  };

  const handleCopyPublicUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedPublicUrl(true);
    setTimeout(() => setCopiedPublicUrl(false), 2000);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 transition-colors cursor-pointer"
        title="Share file"
        style={{ color: "var(--term-text)" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--term-text-bright)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--term-text)";
        }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
      </button>

      {!isOpen ? null : (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "var(--term-backdrop)" }}
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="max-w-lg w-full p-5 border"
              style={{
                backgroundColor: "var(--term-bg-raised)",
                borderColor: "var(--term-border)",
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-sm font-medium" style={{ color: "var(--term-text-bright)" }}>
                    <span className="font-semibold">share // </span>
                    {fileName}
                  </h2>
                  <p className="text-[10px] mt-1" style={{ color: "var(--term-text-muted)" }}>
                    anyone with the link can view in read-only mode
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="transition-colors cursor-pointer"
                  style={{ color: "var(--term-text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--term-text-bright)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--term-text-muted)";
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Create Share Button */}
              <button
                onClick={handleCreateShare}
                disabled={createShare.isPending}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 border border-dashed text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: "var(--term-border)",
                  color: "var(--term-text)",
                }}
                onMouseEnter={(e) => {
                  if (!createShare.isPending) {
                    e.currentTarget.style.borderColor = "var(--term-green)";
                    e.currentTarget.style.color = "var(--term-green)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--term-border)";
                  e.currentTarget.style.color = "var(--term-text)";
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                {createShare.isPending ? "creating..." : "new share link"}
              </button>

              {/* Share Links List */}
              <div className="space-y-2">
                {isLoading ? (
                  <div
                    className="text-center py-6 text-xs"
                    style={{ color: "var(--term-text-muted)" }}
                  >
                    loading...
                  </div>
                ) : shares.length === 0 ? (
                  <div
                    className="text-center py-6 text-xs"
                    style={{ color: "var(--term-text-muted)" }}
                  >
                    // no active share links
                  </div>
                ) : (
                  <>
                    <h3
                      className="text-[10px] font-medium mb-2"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      active links ({shares.length})
                    </h3>
                    {shares.map((share: Share) => {
                      const shareUrl = `${window.location.origin}/share/${share.shareToken}`;
                      const rawUrl = `${window.location.origin}/raw/${share.shareToken}`;
                      const isCopied = copiedToken === share.shareToken;
                      const isRawCopied = copiedRawToken === share.shareToken;

                      return (
                        <div
                          key={share.id}
                          className="p-2.5 border"
                          style={{
                            backgroundColor: "var(--term-bg-surface)",
                            borderColor: "var(--term-border)",
                          }}
                        >
                          {/* Top row: URL + actions */}
                          <div className="flex items-center gap-2">
                            <p
                              className="flex-1 min-w-0 text-[10px] font-mono truncate"
                              style={{ color: "var(--term-text)" }}
                            >
                              {shareUrl}
                            </p>
                            <button
                              onClick={() => handleCopyLink(shareUrl, share.shareToken)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors flex-shrink-0 cursor-pointer border"
                              title="Copy link"
                              style={{
                                color: isCopied ? "var(--term-green)" : "var(--term-text)",
                                borderColor: isCopied ? "var(--term-green)" : "var(--term-border)",
                                backgroundColor: "var(--term-bg-raised)",
                              }}
                              onMouseEnter={(e) => {
                                if (!isCopied) {
                                  e.currentTarget.style.borderColor = "var(--term-text)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isCopied) {
                                  e.currentTarget.style.borderColor = "var(--term-border)";
                                }
                              }}
                            >
                              {isCopied ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                                  />
                                </svg>
                              )}
                              {isCopied ? "copied" : "copy"}
                            </button>
                            <button
                              onClick={() => handleDeleteShare(share.id)}
                              className="p-1 transition-colors flex-shrink-0 cursor-pointer"
                              title="Delete share link"
                              style={{ color: "var(--term-text-muted)" }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = "var(--term-red)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = "var(--term-text-muted)";
                              }}
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                            </button>
                          </div>
                          {/* Raw URL row */}
                          <div className="flex items-center gap-2 mt-1.5">
                            <p
                              className="flex-1 min-w-0 text-[10px] font-mono truncate"
                              style={{ color: "var(--term-text-muted)" }}
                            >
                              raw: {rawUrl}
                            </p>
                            <button
                              onClick={() => handleCopyRawLink(rawUrl, share.shareToken)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors flex-shrink-0 cursor-pointer border"
                              title="Copy raw markdown link"
                              style={{
                                color: isRawCopied ? "var(--term-green)" : "var(--term-text)",
                                borderColor: isRawCopied
                                  ? "var(--term-green)"
                                  : "var(--term-border)",
                                backgroundColor: "var(--term-bg-raised)",
                              }}
                              onMouseEnter={(e) => {
                                if (!isRawCopied) {
                                  e.currentTarget.style.borderColor = "var(--term-text)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isRawCopied) {
                                  e.currentTarget.style.borderColor = "var(--term-border)";
                                }
                              }}
                            >
                              {isRawCopied ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                                  />
                                </svg>
                              )}
                              {isRawCopied ? "copied" : "copy raw"}
                            </button>
                          </div>
                          {/* Bottom row: meta + comments toggle */}
                          <div
                            className="flex items-center justify-between mt-2 pt-2"
                            style={{ borderTop: "1px solid var(--term-border)" }}
                          >
                            <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
                              {share.viewCount} {share.viewCount === 1 ? "view" : "views"} &middot;{" "}
                              {new Date(share.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px]"
                                style={{
                                  color: share.commentsEnabled
                                    ? "var(--term-text)"
                                    : "var(--term-text-muted)",
                                }}
                              >
                                comments
                              </span>
                              <ToggleSwitch
                                checked={share.commentsEnabled}
                                onChange={() => handleToggleComments(share)}
                                disabled={updateShare.isPending}
                              />
                            </div>
                          </div>
                          {/* Anonymous comments sub-toggle */}
                          {share.commentsEnabled && (
                            <div className="flex items-center justify-end gap-2 mt-1.5">
                              <span
                                className="text-[10px]"
                                style={{
                                  color: share.allowAnonymousComments
                                    ? "var(--term-text)"
                                    : "var(--term-text-muted)",
                                }}
                              >
                                allow anonymous
                              </span>
                              <ToggleSwitch
                                checked={share.allowAnonymousComments}
                                onChange={() => handleToggleAnonymous(share)}
                                disabled={updateShare.isPending}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Publish publicly */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--term-border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3
                      className="text-[10px] font-medium"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      publish publicly
                    </h3>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--term-text-muted)" }}>
                      list this file on your public profile
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={visibilityDraft}
                    onChange={handleToggleVisibility}
                    disabled={updateFile.isPending || !me?.username}
                  />
                </div>

                {!me?.username ? (
                  <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
                    // claim a username (profile icon in the header) to publish files publicly
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] flex-shrink-0 font-mono"
                        style={{ color: "var(--term-text-muted)" }}
                      >
                        /u/{me.username}/
                      </span>
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => {
                          setSlugInput(e.target.value);
                          setPublishError(null);
                        }}
                        placeholder="auto from file name"
                        maxLength={MAX_SLUG_LENGTH}
                        disabled={!visibilityDraft}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-[10px] border outline-none font-mono disabled:opacity-40"
                        style={{
                          backgroundColor: "var(--term-bg-surface)",
                          borderColor: "var(--term-border)",
                          color: "var(--term-text)",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "var(--term-border-focus)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "var(--term-border)";
                        }}
                      />
                      <button
                        onClick={handleSavePublish}
                        disabled={updateFile.isPending}
                        className="px-2.5 py-1.5 text-[10px] transition-colors cursor-pointer border border-dashed flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          borderColor: "var(--term-border)",
                          color: "var(--term-text)",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.disabled) {
                            e.currentTarget.style.borderColor = "var(--term-green)";
                            e.currentTarget.style.color = "var(--term-green)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--term-border)";
                          e.currentTarget.style.color = "var(--term-text)";
                        }}
                      >
                        {updateFile.isPending ? "saving..." : "save"}
                      </button>
                    </div>

                    {publishError && (
                      <p className="text-[10px]" style={{ color: "var(--term-red)" }}>
                        {publishError}
                      </p>
                    )}

                    {visibilityDraft && (slugInput.trim() || slug) && (
                      <div className="flex items-center gap-2">
                        <p
                          className="flex-1 min-w-0 text-[10px] font-mono truncate"
                          style={{ color: "var(--term-text)" }}
                        >
                          {`${window.location.origin}/u/${me.username}/${slugInput.trim() || slug}`}
                        </p>
                        <button
                          onClick={() =>
                            handleCopyPublicUrl(
                              `${window.location.origin}/u/${me.username}/${slugInput.trim() || slug}`,
                            )
                          }
                          className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors flex-shrink-0 cursor-pointer border"
                          title="Copy public URL"
                          style={{
                            color: copiedPublicUrl ? "var(--term-green)" : "var(--term-text)",
                            borderColor: copiedPublicUrl
                              ? "var(--term-green)"
                              : "var(--term-border)",
                            backgroundColor: "var(--term-bg-raised)",
                          }}
                          onMouseEnter={(e) => {
                            if (!copiedPublicUrl) {
                              e.currentTarget.style.borderColor = "var(--term-text)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!copiedPublicUrl) {
                              e.currentTarget.style.borderColor = "var(--term-border)";
                            }
                          }}
                        >
                          {copiedPublicUrl ? "copied" : "copy"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
