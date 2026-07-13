import { useState, useEffect, useCallback } from "react";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "../hooks/use-api-keys";
import type { ApiKey, ApiKeyScope, CreateApiKeyResponse } from "@markdown-viewer/shared";

const MAX_KEY_NAME_LENGTH = 100;

const SCOPE_OPTIONS: { value: ApiKeyScope; label: string; hint: string }[] = [
  {
    value: "docs",
    label: "docs",
    hint: "publish, read & comment on documents — recommended for agents",
  },
  {
    value: "full",
    label: "full",
    hint: "everything, including username and public publishing",
  },
];

function CopyIcon({ copied }: { copied: boolean }) {
  return copied ? (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
      />
    </svg>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <p
        className="flex-1 min-w-0 text-[10px] font-mono break-all"
        style={{ color: "var(--term-text)" }}
      >
        {value}
      </p>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 text-[10px] transition-colors flex-shrink-0 cursor-pointer border"
        title={`Copy ${label}`}
        style={{
          color: copied ? "var(--term-green)" : "var(--term-text)",
          borderColor: copied ? "var(--term-green)" : "var(--term-border)",
          backgroundColor: "var(--term-bg-raised)",
        }}
        onMouseEnter={(e) => {
          if (!copied) e.currentTarget.style.borderColor = "var(--term-text)";
        }}
        onMouseLeave={(e) => {
          if (!copied) e.currentTarget.style.borderColor = "var(--term-border)";
        }}
      >
        <CopyIcon copied={copied} />
        {copied ? "copied" : "copy"}
      </button>
    </div>
  );
}

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

interface ApiKeysModalProps {
  // When provided, the modal is controlled from outside (e.g. the user menu)
  // and renders no trigger of its own.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ApiKeysModal({ open, onOpenChange }: ApiKeysModalProps = {}) {
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
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<ApiKeyScope>("docs");
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResponse | null>(null);

  const { data: keys = [], isLoading } = useApiKeys(isOpen);
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCreatedKey(null);
    setNewKeyName("");
    setNewKeyScope("docs");
  }, []);

  const handleCreate = () => {
    const name = newKeyName.trim();
    if (!name) return;
    createApiKey.mutate(
      { name, scope: newKeyScope },
      {
        onSuccess: (data) => {
          setCreatedKey(data);
          setNewKeyName("");
          setNewKeyScope("docs");
        },
      },
    );
  };

  const handleRevoke = (key: ApiKey) => {
    if (confirm(`Revoke "${key.name}"? Any tools using this key will stop working.`)) {
      deleteApiKey.mutate(key.id);
    }
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

  const mcpSnippet = createdKey
    ? `claude mcp add --transport http mdv ${window.location.origin}/api/mcp --header "Authorization: Bearer ${createdKey.key}"`
    : "";

  return (
    <>
      {!controlled && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-1.5 transition-colors cursor-pointer"
          title="API keys"
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
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
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
                    <span className="font-semibold">api keys // </span>
                    manage
                  </h2>
                  <p className="text-[10px] mt-1" style={{ color: "var(--term-text-muted)" }}>
                    long-lived bearer tokens for agents and scripts
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

              {createdKey ? (
                /* Create-success state: plaintext key shown exactly once */
                <div className="space-y-3 mb-4">
                  <div
                    className="p-3 border"
                    style={{
                      backgroundColor: "var(--term-bg-surface)",
                      borderColor: "var(--term-amber)",
                    }}
                  >
                    <p
                      className="text-[10px] font-medium mb-2"
                      style={{ color: "var(--term-amber)" }}
                    >
                      copy this key now &mdash; you won&apos;t see it again
                    </p>
                    <CopyRow label="API key" value={createdKey.key} />
                  </div>

                  <div>
                    <p
                      className="text-[10px] font-medium mb-1.5"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      add to claude code
                    </p>
                    <CopyRow label="claude mcp add command" value={mcpSnippet} />
                  </div>

                  <button
                    onClick={() => setCreatedKey(null)}
                    className="w-full px-3 py-2 text-xs transition-colors cursor-pointer border"
                    style={{
                      borderColor: "var(--term-border)",
                      color: "var(--term-text)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--term-text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--term-border)";
                    }}
                  >
                    done
                  </button>
                </div>
              ) : (
                /* Create form */
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                      }}
                      placeholder="e.g. claude-code on macbook"
                      maxLength={MAX_KEY_NAME_LENGTH}
                      className="flex-1 min-w-0 px-2.5 py-2 text-xs border outline-none"
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
                      onClick={handleCreate}
                      disabled={createApiKey.isPending || !newKeyName.trim()}
                      className="px-3 py-2 text-xs transition-colors cursor-pointer border border-dashed flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        borderColor: "var(--term-border)",
                        color: "var(--term-text)",
                      }}
                      onMouseEnter={(e) => {
                        if (!createApiKey.isPending && newKeyName.trim()) {
                          e.currentTarget.style.borderColor = "var(--term-green)";
                          e.currentTarget.style.color = "var(--term-green)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--term-border)";
                        e.currentTarget.style.color = "var(--term-text)";
                      }}
                    >
                      {createApiKey.isPending ? "creating..." : "create key"}
                    </button>
                  </div>

                  {/* Scope picker */}
                  <div className="space-y-1.5">
                    <p
                      className="text-[10px] font-medium"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      scope
                    </p>
                    {SCOPE_OPTIONS.map((option) => {
                      const selected = newKeyScope === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setNewKeyScope(option.value)}
                          className="w-full flex items-start gap-2 p-2.5 text-left border transition-colors cursor-pointer"
                          style={{
                            backgroundColor: "var(--term-bg-surface)",
                            borderColor: selected ? "var(--term-green)" : "var(--term-border)",
                          }}
                          onMouseEnter={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = "var(--term-text)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) e.currentTarget.style.borderColor = "var(--term-border)";
                          }}
                        >
                          <span
                            className="mt-0.5 text-[10px] font-mono flex-shrink-0"
                            style={{
                              color: selected ? "var(--term-green)" : "var(--term-text-muted)",
                            }}
                          >
                            {selected ? "[x]" : "[ ]"}
                          </span>
                          <span className="min-w-0">
                            <span
                              className="text-xs font-medium"
                              style={{
                                color: selected ? "var(--term-green)" : "var(--term-text)",
                              }}
                            >
                              {option.label}
                            </span>
                            <span
                              className="block text-[10px] mt-0.5"
                              style={{ color: "var(--term-text-muted)" }}
                            >
                              {option.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Keys list */}
              <div className="space-y-2">
                {isLoading ? (
                  <div
                    className="text-center py-6 text-xs"
                    style={{ color: "var(--term-text-muted)" }}
                  >
                    loading...
                  </div>
                ) : keys.length === 0 ? (
                  <div
                    className="text-center py-6 text-xs"
                    style={{ color: "var(--term-text-muted)" }}
                  >
                    // no api keys yet
                  </div>
                ) : (
                  <>
                    <h3
                      className="text-[10px] font-medium mb-2"
                      style={{ color: "var(--term-text-muted)" }}
                    >
                      active keys ({keys.length})
                    </h3>
                    {keys.map((key) => (
                      <div
                        key={key.id}
                        className="p-2.5 border"
                        style={{
                          backgroundColor: "var(--term-bg-surface)",
                          borderColor: "var(--term-border)",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <p
                            className="flex-1 min-w-0 text-xs truncate"
                            style={{ color: "var(--term-text)" }}
                          >
                            {key.name}
                          </p>
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 border flex-shrink-0"
                            style={{
                              color: "var(--term-text-muted)",
                              borderColor: "var(--term-border)",
                            }}
                            title={`${key.scope} scope`}
                          >
                            {key.scope}
                          </span>
                          <button
                            onClick={() => handleRevoke(key)}
                            className="p-1 transition-colors flex-shrink-0 cursor-pointer"
                            title="Revoke key"
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
                        <div
                          className="flex items-center justify-between mt-2 pt-2"
                          style={{ borderTop: "1px solid var(--term-border)" }}
                        >
                          <p
                            className="text-[10px] font-mono"
                            style={{ color: "var(--term-text-muted)" }}
                          >
                            {key.keyPrefix}&hellip;
                          </p>
                          <p className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
                            created {formatDate(key.createdAt)}
                            {key.lastUsedAt && (
                              <> &middot; last used {formatDate(key.lastUsedAt)}</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
