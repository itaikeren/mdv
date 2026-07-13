import { useState, useEffect, useCallback } from "react";
import { useMe, useUpdateUsername } from "../hooks/use-profile";

const MAX_USERNAME_LENGTH = 32;

interface UsernameModalProps {
  // When provided, the modal is controlled from outside (e.g. the user menu)
  // and renders no trigger of its own.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UsernameModal({ open, onOpenChange }: UsernameModalProps = {}) {
  const controlled = onOpenChange !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? !!open : internalOpen;
  const setIsOpen = useCallback(
    (v: boolean) => {
      if (controlled) onOpenChange!(v);
      else setInternalOpen(v);
    },
    [controlled, onOpenChange],
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: me, isLoading } = useMe(isOpen);
  const updateUsername = useUpdateUsername();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  // Seed the input from the current username each time the modal opens
  useEffect(() => {
    if (isOpen && me) {
      setUsernameInput(me.username ?? "");
    }
  }, [isOpen, me]);

  const handleSave = () => {
    const username = usernameInput.trim().toLowerCase();
    if (!username) return;
    setError(null);
    updateUsername.mutate(username, {
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to update username");
      },
    });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    },
    [handleClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const profileUrl = me?.username ? `${window.location.origin}/u/${me.username}` : null;

  return (
    <>
      {!controlled && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 transition-colors cursor-pointer"
          title="Username & public profile"
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
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </button>
      )}

      {!isOpen ? null : (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "var(--term-backdrop)" }}
            onClick={handleClose}
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
                    <span className="font-semibold">profile // </span>
                    username
                  </h2>
                  <p className="text-[10px] mt-1" style={{ color: "var(--term-text-muted)" }}>
                    claim a username to publish files publicly at /u/username
                  </p>
                </div>
                <button
                  onClick={handleClose}
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

              {isLoading ? (
                <div
                  className="text-center py-6 text-xs"
                  style={{ color: "var(--term-text-muted)" }}
                >
                  loading...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs flex-shrink-0"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      /u/
                    </span>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => {
                        setUsernameInput(e.target.value);
                        setError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                      }}
                      placeholder="your-handle"
                      maxLength={MAX_USERNAME_LENGTH}
                      className="flex-1 min-w-0 px-2.5 py-2 text-xs border outline-none font-mono"
                      style={{
                        backgroundColor: "var(--term-bg-surface)",
                        borderColor: error ? "var(--term-red)" : "var(--term-border)",
                        color: "var(--term-text)",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = error
                          ? "var(--term-red)"
                          : "var(--term-border-focus)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = error
                          ? "var(--term-red)"
                          : "var(--term-border)";
                      }}
                    />
                    <button
                      onClick={handleSave}
                      disabled={
                        updateUsername.isPending ||
                        !usernameInput.trim() ||
                        usernameInput.trim().toLowerCase() === (me?.username ?? "")
                      }
                      className="px-3 py-2 text-xs transition-colors cursor-pointer border border-dashed flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                      {updateUsername.isPending ? "saving..." : "save"}
                    </button>
                  </div>

                  {error && (
                    <p className="text-[10px]" style={{ color: "var(--term-red)" }}>
                      {error}
                    </p>
                  )}

                  <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
                    3-32 characters: lowercase letters, numbers, and hyphens
                  </p>

                  {profileUrl && (
                    <div className="pt-3" style={{ borderTop: "1px solid var(--term-border)" }}>
                      <p className="text-[10px] mb-1" style={{ color: "var(--term-text-muted)" }}>
                        your public profile
                      </p>
                      <a
                        href={profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono break-all transition-colors"
                        style={{ color: "var(--term-green)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--term-text-bright)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--term-green)";
                        }}
                      >
                        {profileUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
