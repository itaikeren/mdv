import React, { useEffect, useState, memo } from "react";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { highlightCode } from "../utils/highlighter";
import { Mermaid } from "./mermaid";
import { useTheme } from "../hooks/use-theme";

// Utility function to generate ID from heading text
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Custom heading components with IDs for anchor links
function HeadingRenderer({ level, children }: { level: number; children: ReactNode }) {
  const text = React.Children.toArray(children).join("");
  const id = generateHeadingId(text);

  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return (
    <HeadingTag id={id} className={`heading-${level}`}>
      {children}
    </HeadingTag>
  );
}

// Custom link component with smooth scrolling for anchor links
function LinkRenderer({ href, children }: { href?: string; children: ReactNode }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (href?.startsWith("#")) {
      e.preventDefault();
      const targetId = href.slice(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        const header = document.querySelector("header");
        const headerHeight = header ? header.offsetHeight : 80;
        const offset = headerHeight + 24;

        const elementPosition = targetElement.offsetTop;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className="underline transition-colors"
      style={{
        color: "var(--term-green)",
        textDecorationColor: "var(--term-link-underline)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecorationColor = "var(--term-green)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecorationColor = "var(--term-link-underline)";
      }}
    >
      {children}
    </a>
  );
}

interface PreviewProps {
  markdown: string;
}

interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
}

function PreWrapper({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

function H1Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={1}>{children}</HeadingRenderer>;
}

function H2Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={2}>{children}</HeadingRenderer>;
}

function H3Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={3}>{children}</HeadingRenderer>;
}

function H4Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={4}>{children}</HeadingRenderer>;
}

function H5Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={5}>{children}</HeadingRenderer>;
}

function H6Wrapper({ children }: { children?: ReactNode }) {
  return <HeadingRenderer level={6}>{children}</HeadingRenderer>;
}

function LinkWrapper({ href, children }: { href?: string; children?: ReactNode }) {
  return <LinkRenderer href={href}>{children}</LinkRenderer>;
}

const CodeBlock = React.memo(function CodeBlock({ children, className }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");

  const code = String(children).replace(/\n$/, "");

  const isCodeBlock = className?.startsWith("language-") || code.includes("\n");

  const language = className?.replace("language-", "") || "text";
  const isMermaid = language === "mermaid";

  useEffect(() => {
    if (!isCodeBlock || isMermaid) return;

    highlightCode(code, language)
      .then(setHighlightedCode)
      .catch(() => {
        setHighlightedCode(`<pre><code>${code}</code></pre>`);
      });
  }, [code, language, isCodeBlock, isMermaid]);

  // Inline code
  if (!isCodeBlock) {
    return (
      <code
        className="px-1.5 py-0.5 text-xs font-mono"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          color: "var(--term-green)",
          border: "1px solid var(--term-border)",
        }}
      >
        {children}
      </code>
    );
  }

  // Mermaid diagram
  if (isMermaid) {
    return <Mermaid chart={code} />;
  }

  // Code block - loading fallback
  if (!highlightedCode) {
    return (
      <pre
        className="p-4 overflow-x-auto text-xs font-mono"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          border: "1px solid var(--term-border)",
        }}
      >
        <code style={{ color: "var(--term-text)" }}>{children}</code>
      </pre>
    );
  }

  return (
    <div
      className="my-4 overflow-x-auto"
      style={{
        border: "1px solid var(--term-border)",
        backgroundColor: "var(--term-bg-surface)",
      }}
      dangerouslySetInnerHTML={{ __html: highlightedCode }}
    />
  );
});

const MARKDOWN_COMPONENTS = {
  code: CodeBlock,
  pre: PreWrapper,
  h1: H1Wrapper,
  h2: H2Wrapper,
  h3: H3Wrapper,
  h4: H4Wrapper,
  h5: H5Wrapper,
  h6: H6Wrapper,
  a: LinkWrapper,
};

const MARKDOWN_PLUGINS = [remarkGfm];

export const Preview = memo(function Preview({ markdown }: PreviewProps) {
  const { theme } = useTheme();

  return (
    <div
      className="h-full overflow-y-auto p-4"
      style={{
        backgroundColor: "var(--term-bg-raised)",
        border: "1px solid var(--term-border)",
      }}
    >
      {markdown ? (
        <div className="prose prose-sm prose-invert max-w-none" key={theme}>
          <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={MARKDOWN_COMPONENTS}>
            {markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-center text-xs" style={{ color: "var(--term-text-muted)" }}>
            // start typing to see preview
          </p>
        </div>
      )}
    </div>
  );
});
