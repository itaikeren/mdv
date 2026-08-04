import { memo } from "react";
import { SignInButton } from "@clerk/clerk-react";
import { TermButton } from "../components/term-button";
import { ThemeToggle } from "../components/theme-toggle";
import { GithubIconLink, GithubTextLink } from "../components/github-link";

/**
 * Signed-out homepage. Modern dev-workstation aesthetic: Geist Mono carries the
 * chrome and display headlines, Geist Sans the reading copy, Pixelify Sans the
 * brand mark. Everything keys off the --term-* tokens so both themes work free.
 */

// --- Pixel icons (pixelarticons, MIT — https://github.com/halfmage/pixelarticons) ---

const PIXEL_PATHS = {
  eye: "M16 20H8v-2h8v2Zm-8-2H4v-2h4v2Zm12 0h-4v-2h4v2ZM4 16H2v-2h2v2Zm10-6h-2v2h2v-2h2v4h-2v2h-4v-2H8v-4h2V8h4v2Zm8 6h-2v-2h2v2ZM2 14H0v-4h2v4Zm22 0h-2v-4h2v4ZM4 10H2V8h2v2Zm18 0h-2V8h2v2ZM8 8H4V6h4v2Zm12 0h-4V6h4v2Zm-4-2H8V4h8v2Z",
  link: "M4 6h7v2H4zm0 10h7v2H4zM2 8h2v8H2zm18-2h-7v2h7zm0 10h-7v2h7zm2-8h-2v8h2zM7 11h10v2H7z",
  message: "M20 2H4v2h16zm0 14H6v2h14zm2-12h-2v12h2zM4 4H2v18h2zm2 14H4v2h2zm0-6h4v2H6zm0-4h8v2H6z",
  users:
    "M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z",
  article:
    "M8 2h12v2H8zM6 4h2v16H6zm14 0h2v16h-2zM4 20h16v2H4zm-2-9h2v9H2zm2-2h2v2H4zm6-3h8v2h-8zm0 4h8v2h-8zm0-2h2v2h-2zm6 0h2v2h-2zm-6 5h8v2h-8zm0 3h4v2h-4z",
  lock: "M5 8h14v2H5zm0 12h14v2H5zM3 10h2v10H3zm16 0h2v10h-2zM7 4h2v4H7zm2-2h6v2H9zm6 2h2v4h-2z",
  terminal:
    "M4 2h16v2H4zm0 18h16v2H4zM2 4h2v16H2zm18 0h2v16h-2zM6 16h2v2H6zm2-2h2v2H8zm-2-2h2v2H6z",
} as const;

function PixelIcon({
  name,
  className = "w-5 h-5",
}: {
  name: keyof typeof PIXEL_PATHS;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={className}
    >
      <path d={PIXEL_PATHS[name]} />
    </svg>
  );
}

// Small mono eyebrow label with a green comment prefix.
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs mb-6" style={{ color: "var(--term-text-muted)" }}>
      <span style={{ color: "var(--term-green)" }}>//</span> {children}
    </p>
  );
}

const HEADING_STYLE: React.CSSProperties = {
  color: "var(--term-text-bright)",
  fontSize: "clamp(1.7rem, 1.25rem + 1.9vw, 2.5rem)",
  lineHeight: 1.1,
  fontWeight: 680,
  letterSpacing: "-0.03em",
};

// --- Window chrome for the product mocks (boxy, terminal-style) ---

function WindowChrome({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: "var(--term-bg-raised)",
        border: "1px solid var(--term-border)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--term-border)" }}
      >
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5" style={{ backgroundColor: "var(--term-red)" }} />
          <span className="w-2.5 h-2.5" style={{ backgroundColor: "var(--term-amber)" }} />
          <span className="w-2.5 h-2.5" style={{ backgroundColor: "var(--term-green)" }} />
        </span>
        <span className="text-[11px] flex-1 truncate" style={{ color: "var(--term-text-muted)" }}>
          {title}
        </span>
        {badge && (
          <span className="text-[10px]" style={{ color: "var(--term-text-muted)" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** The split editor: markdown source left, rendered preview right. */
function EditorMock() {
  return (
    <div className="relative">
      <WindowChrome title="release-notes.md — mdv" badge="[split]">
        <div className="grid sm:grid-cols-2">
          {/* Source pane (mono) */}
          <div
            className="hidden sm:block p-4 text-[11px] leading-[1.9] whitespace-pre overflow-hidden"
            style={{ borderRight: "1px solid var(--term-border)", color: "var(--term-text-muted)" }}
            aria-hidden="true"
          >
            <div>
              <span style={{ color: "var(--term-green)" }}># </span>
              <span style={{ color: "var(--term-text-bright)" }}>Redline v0.4</span>
            </div>
            <div>Ship notes for the October release.</div>
            <div>&nbsp;</div>
            <div>
              <span style={{ color: "var(--term-green)" }}>## </span>
              <span style={{ color: "var(--term-text)" }}>What changed</span>
            </div>
            <div>
              <span style={{ color: "var(--term-green)" }}>- </span>Live preview as you type
            </div>
            <div>
              <span style={{ color: "var(--term-green)" }}>- </span>Mermaid diagrams render inline
            </div>
            <div>
              <span style={{ color: "var(--term-green)" }}>- </span>Comments anchored to lines
            </div>
            <div>&nbsp;</div>
            <div>
              Deploy with <span style={{ color: "var(--term-amber)" }}>`redline ship`</span>
              <span className="landing-caret" style={{ color: "var(--term-green)" }}>
                ▍
              </span>
            </div>
          </div>

          {/* Preview pane (rendered → sans) */}
          <div className="font-sans p-4 text-[11px] leading-[1.9]">
            <p className="text-[15px] font-bold mb-1" style={{ color: "var(--term-text-bright)" }}>
              Redline v0.4
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--term-text)" }}>
              Ship notes for the October release.
            </p>
            <p className="text-[13px] font-bold mb-1" style={{ color: "var(--term-text-bright)" }}>
              What changed
            </p>
            <ul className="text-xs space-y-0.5 mb-3" style={{ color: "var(--term-text)" }}>
              <li className="flex gap-2">
                <span style={{ color: "var(--term-text-muted)" }}>•</span>Live preview as you type
              </li>
              <li className="flex gap-2">
                <span style={{ color: "var(--term-text-muted)" }}>•</span>Mermaid diagrams render
                inline
              </li>
              <li className="flex gap-2">
                <span style={{ color: "var(--term-text-muted)" }}>•</span>Comments anchored to lines
              </li>
            </ul>
            <p className="text-xs" style={{ color: "var(--term-text)" }}>
              Deploy with{" "}
              <code
                className="font-mono px-1 text-[10px]"
                style={{ backgroundColor: "var(--term-bg-surface)", color: "var(--term-green)" }}
              >
                redline ship
              </code>
            </p>
          </div>
        </div>
      </WindowChrome>

      {/* Line-anchored comment, floating over the window's bottom edge */}
      <div
        className="absolute -bottom-3.5 right-6 px-2.5 py-1.5 text-[10px] flex items-center gap-1.5"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          border: "1px solid var(--term-border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <span style={{ color: "var(--term-green)" }}>●</span>
        <span style={{ color: "var(--term-text-muted)" }}>yael · L6</span>
        <span className="font-sans" style={{ color: "var(--term-text-bright)" }}>
          ship it
        </span>
      </div>
    </div>
  );
}

/** An agent session publishing a doc over MCP. */
function AgentTerminalMock() {
  return (
    <WindowChrome title="agent — claude code" badge="mcp: mdv ✓">
      <div className="p-4 text-[11px] leading-[2] whitespace-pre-wrap break-all sm:break-normal">
        <div style={{ color: "var(--term-text)" }}>
          <span style={{ color: "var(--term-text-muted)" }}>$ </span>claude mcp add --transport http
          mdv \
        </div>
        <div style={{ color: "var(--term-text)" }}>{"    "}https://mdv.itai.sh/api/mcp</div>
        <div style={{ color: "var(--term-green)" }}>✓ connected · 6 tools</div>
        <div>&nbsp;</div>
        <div style={{ color: "var(--term-text-bright)" }}>
          <span style={{ color: "var(--term-text-muted)" }}>&gt; </span>publish this week's
          changelog
        </div>
        <div style={{ color: "var(--term-text)" }}>
          <span style={{ color: "var(--term-green)" }}>⏺ </span>publish_document(name:
          "changelog-w28.md")
        </div>
        <div style={{ color: "var(--term-text-muted)" }}>
          {"  "}⎿ share_url:{" "}
          <span style={{ color: "var(--term-blue)", textDecoration: "underline" }}>
            mdv.itai.sh/share/x7kf9q2m
          </span>
        </div>
        <div>
          <span style={{ color: "var(--term-text-muted)" }}>&gt; </span>
          <span className="landing-caret" style={{ color: "var(--term-green)" }}>
            ▍
          </span>
        </div>
      </div>
    </WindowChrome>
  );
}

// --- Content data ---

const MCP_TOOLS: ReadonlyArray<{ name: string; desc: string }> = [
  { name: "publish_document", desc: "Create a doc and get back a live share link" },
  { name: "read_document", desc: "Fetch any public doc as raw markdown" },
  { name: "update_document", desc: "Replace content — existing links keep working" },
  { name: "get_comments", desc: "Read line-anchored feedback, reply to threads" },
];

const FEATURES: ReadonlyArray<{
  icon: keyof typeof PIXEL_PATHS;
  name: string;
  desc: string;
  wide?: boolean;
}> = [
  {
    icon: "eye",
    name: "split_editor",
    desc: "Markdown on the left, rendered preview on the right — live as you type, with GitHub Flavored Markdown throughout.",
    wide: true,
  },
  {
    icon: "link",
    name: "share_links",
    desc: "One URL per doc. Public, revocable, readable without an account.",
  },
  {
    icon: "message",
    name: "comments",
    desc: "Line-anchored threads on any shared doc, with single-level replies.",
  },
  {
    icon: "users",
    name: "public_profiles",
    desc: "Claim /u/you and give every doc a clean, permanent slug.",
  },
  {
    icon: "article",
    name: "diagrams_and_code",
    desc: "Mermaid diagrams and Shiki-highlighted code blocks, rendered inline.",
  },
];

// --- Page ---

export const Landing = memo(function Landing() {
  return (
    <div className="landing min-h-screen" style={{ backgroundColor: "var(--term-bg)" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid var(--term-border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span
            className="font-pixel text-lg"
            style={{ color: "var(--term-text-bright)", fontWeight: 600 }}
          >
            mdv
            <span className="landing-caret" style={{ color: "var(--term-green)" }}>
              _
            </span>
          </span>
          <div className="flex items-center gap-3">
            <GithubIconLink />
            <ThemeToggle />
            <SignInButton mode="modal">
              <TermButton>sign_in</TermButton>
            </SignInButton>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="landing-reveal" style={{ "--reveal-i": 0 } as React.CSSProperties}>
                <Eyebrow>for humans &amp; agents</Eyebrow>
              </div>
              <h1
                className="landing-reveal mb-6"
                style={
                  {
                    ...HEADING_STYLE,
                    fontSize: "clamp(2rem, 1.1rem + 2.6vw, 3rem)",
                    lineHeight: 1.06,
                    fontWeight: 700,
                    "--reveal-i": 1,
                  } as React.CSSProperties
                }
              >
                Write it in markdown.
                <br />
                Ship it as a link.
              </h1>
              <p
                className="font-sans landing-reveal text-base leading-relaxed mb-8 max-w-[46ch]"
                style={{ color: "var(--term-text)", "--reveal-i": 2 } as React.CSSProperties}
              >
                mdv is a fast markdown workspace — split-screen editing, live preview, one-click
                share links. And your AI agents can publish here too, straight over MCP.
              </p>
              <div
                className="landing-reveal flex items-center gap-5 flex-wrap"
                style={{ "--reveal-i": 3 } as React.CSSProperties}
              >
                <SignInButton mode="modal">
                  <TermButton className="px-6 py-2.5">sign_in</TermButton>
                </SignInButton>
                <a
                  href="#agents"
                  className="text-xs transition-colors"
                  style={{ color: "var(--term-text-muted)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--term-green)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--term-text-muted)";
                  }}
                >
                  ↓ how agents publish
                </a>
              </div>
            </div>
            <div className="landing-reveal" style={{ "--reveal-i": 4 } as React.CSSProperties}>
              <EditorMock />
            </div>
          </div>
        </section>

        {/* Agents / MCP */}
        <section id="agents" style={{ borderTop: "1px solid var(--term-border)" }}>
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
            <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-12 lg:gap-16 items-start">
              <div className="order-2 lg:order-1">
                <AgentTerminalMock />
              </div>
              <div className="order-1 lg:order-2">
                <Eyebrow>agents</Eyebrow>
                <h2 className="mb-5" style={HEADING_STYLE}>
                  Your agents publish here too.
                </h2>
                <p
                  className="font-sans text-[15px] leading-relaxed mb-8 max-w-[52ch]"
                  style={{ color: "var(--term-text)" }}
                >
                  mdv ships a built-in MCP server. Hand your agent an API key and it can publish
                  reports, keep docs up to date, and read the comments your team leaves — no
                  browser, no copy-paste.
                </p>
                <dl>
                  {MCP_TOOLS.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2.5"
                      style={{ borderTop: "1px solid var(--term-border)" }}
                    >
                      <dt
                        className="text-xs shrink-0 sm:w-44"
                        style={{ color: "var(--term-green)" }}
                      >
                        {tool.name}
                      </dt>
                      <dd
                        className="font-sans text-[13px]"
                        style={{ color: "var(--term-text-muted)" }}
                      >
                        {tool.desc}
                      </dd>
                    </div>
                  ))}
                  <div
                    className="py-2.5 text-[11px]"
                    style={{
                      borderTop: "1px solid var(--term-border)",
                      color: "var(--term-text-muted)",
                    }}
                  >
                    + list_documents, add_comment
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ borderTop: "1px solid var(--term-border)" }}>
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
            <Eyebrow>the workspace</Eyebrow>
            <h2 className="mb-12" style={HEADING_STYLE}>
              Everything a doc needs.
            </h2>
            <div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px"
              style={{
                backgroundColor: "var(--term-border)",
                border: "1px solid var(--term-border)",
              }}
            >
              {FEATURES.map((feature) => (
                <div
                  key={feature.name}
                  className={`p-6 lg:p-7 ${feature.wide ? "sm:col-span-2" : ""}`}
                  style={{ backgroundColor: "var(--term-bg)" }}
                >
                  <span style={{ color: "var(--term-green)" }}>
                    <PixelIcon name={feature.icon} />
                  </span>
                  <h3
                    className="text-xs font-bold mt-4 mb-2"
                    style={{ color: "var(--term-text-bright)" }}
                  >
                    {feature.name}
                  </h3>
                  <p
                    className="font-sans text-[13px] leading-relaxed max-w-[44ch]"
                    style={{ color: "var(--term-text-muted)" }}
                  >
                    {feature.desc}
                  </p>
                </div>
              ))}
              {/* Full-width closing row keeps the hairline grid rectangular */}
              <div
                className="p-6 lg:p-7 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-5"
                style={{ backgroundColor: "var(--term-bg)" }}
              >
                <span className="flex items-center gap-3 shrink-0">
                  <span style={{ color: "var(--term-green)" }}>
                    <PixelIcon name="lock" />
                  </span>
                  <h3 className="text-xs font-bold" style={{ color: "var(--term-text-bright)" }}>
                    api_keys
                  </h3>
                </span>
                <p
                  className="font-sans text-[13px] leading-relaxed"
                  style={{ color: "var(--term-text-muted)" }}
                >
                  Scoped mdv_ keys power the MCP endpoint. Create, rotate, and revoke them from the
                  app — one key per agent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section style={{ borderTop: "1px solid var(--term-border)" }}>
          <div className="max-w-6xl mx-auto px-6 py-20 lg:py-24">
            <p className="text-xs mb-5" style={{ color: "var(--term-text-muted)" }}>
              <span style={{ color: "var(--term-green)" }}>$</span> mdv publish
            </p>
            <h2 className="mb-8" style={HEADING_STYLE}>
              Your next doc deserves a link.
            </h2>
            <SignInButton mode="modal">
              <TermButton className="px-6 py-2.5">sign_in</TermButton>
            </SignInButton>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--term-border)" }}>
        <div
          className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-[11px]"
          style={{ color: "var(--term-text-muted)" }}
        >
          <span>
            <span className="font-pixel" style={{ color: "var(--term-text-bright)" }}>
              mdv
            </span>{" "}
            © 2026
          </span>
          <span className="hidden md:flex items-center gap-1.5">
            <PixelIcon name="terminal" className="w-3.5 h-3.5" />
            built for people who live in terminals
          </span>
          <GithubTextLink label="open source · github" />
        </div>
      </footer>
    </div>
  );
});
