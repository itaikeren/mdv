import React, { useCallback, useEffect, useRef, useState, memo, lazy, Suspense } from "react";
import type { ReactNode, Ref } from "react";
import { CommentBlockAffordance } from "./comment-block-affordance";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "../hooks/use-theme";
import { rehypeSourceLines } from "../utils/rehype-source-lines";

// Source line range stamped by rehypeSourceLines; custom components drop
// unknown props, so each must forward these onto its outermost element for
// sync scroll anchoring to work.
interface SourceLineProps {
  "data-line"?: string | number;
  "data-line-end"?: string | number;
}

// Mermaid is heavy - only download it when a document actually contains a diagram
const Mermaid = lazy(() => import("./mermaid").then((m) => ({ default: m.Mermaid })));

function MermaidFallback() {
  return (
    <div className="my-4 flex justify-center">
      <div
        className="w-full max-w-full border p-4 flex items-center justify-center text-xs"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          borderColor: "var(--term-border)",
          minHeight: "200px",
          color: "var(--term-text-muted)",
        }}
      >
        rendering...
      </div>
    </div>
  );
}

// Utility function to generate ID from heading text
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Extract plain text from rendered children (handles nested elements like
// bold/code inside headings, which would otherwise stringify to [object Object])
function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// Custom heading components with IDs for anchor links
function HeadingRenderer({
  level,
  children,
  "data-line": dataLine,
  "data-line-end": dataLineEnd,
}: { level: number; children: ReactNode } & SourceLineProps) {
  const text = extractText(children);
  const id = generateHeadingId(text);

  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;

  return (
    <HeadingTag
      id={id}
      className={`heading-${level}`}
      data-line={dataLine}
      data-line-end={dataLineEnd}
    >
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
  scrollRef?: Ref<HTMLDivElement>;
  // When provided (share view), hovering a block reveals a "+" affordance that
  // reports the block's source-line range so it can be commented on. Absent for
  // the main editor, where behavior is unchanged.
  onCommentOnBlock?: (startLine: number, endLine: number) => void;
  // In the in-app workspace (split/preview modes) the rendered column fills the
  // pane; public reading views keep the capped, comfortable measure.
  wide?: boolean;
}

interface CodeBlockProps extends SourceLineProps {
  children?: ReactNode;
  className?: string;
}

type WrapperProps = { children?: ReactNode } & SourceLineProps;

function PreWrapper({
  children,
  "data-line": dataLine,
  "data-line-end": dataLineEnd,
}: WrapperProps) {
  return (
    <div data-line={dataLine} data-line-end={dataLineEnd}>
      {children}
    </div>
  );
}

function H1Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={1} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

function H2Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={2} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

function H3Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={3} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

function H4Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={4} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

function H5Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={5} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

function H6Wrapper({ children, ...lines }: WrapperProps) {
  return (
    <HeadingRenderer level={6} {...pickSourceLines(lines)}>
      {children}
    </HeadingRenderer>
  );
}

// react-markdown passes extra runtime props (e.g. the hast node) that must
// not leak onto DOM elements, so forward only the data-line pair.
function pickSourceLines(props: SourceLineProps): SourceLineProps {
  return {
    "data-line": props["data-line"],
    "data-line-end": props["data-line-end"],
  };
}

function LinkWrapper({ href, children }: { href?: string; children?: ReactNode }) {
  return <LinkRenderer href={href}>{children}</LinkRenderer>;
}

const CodeBlock = React.memo(function CodeBlock({
  children,
  className,
  "data-line": dataLine,
  "data-line-end": dataLineEnd,
}: CodeBlockProps) {
  const { theme } = useTheme();
  const [highlightedCode, setHighlightedCode] = useState<string>("");

  const code = String(children).replace(/\n$/, "");

  const isCodeBlock = className?.startsWith("language-") || code.includes("\n");

  const language = className?.replace("language-", "") || "text";
  const isMermaid = language === "mermaid";

  useEffect(() => {
    if (!isCodeBlock || isMermaid) return;

    let cancelled = false;
    // Shiki is only downloaded once a document actually contains a code block
    import("../utils/highlighter")
      .then(({ highlightCode }) => highlightCode(code, language, theme))
      .then((html) => {
        if (!cancelled) setHighlightedCode(html);
      })
      .catch(() => {
        if (!cancelled) setHighlightedCode("");
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, isCodeBlock, isMermaid, theme]);

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
    return (
      <div data-line={dataLine} data-line-end={dataLineEnd}>
        <Suspense fallback={<MermaidFallback />}>
          <Mermaid chart={code} />
        </Suspense>
      </div>
    );
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
        data-line={dataLine}
        data-line-end={dataLineEnd}
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
      data-line={dataLine}
      data-line-end={dataLineEnd}
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
const REHYPE_PLUGINS = [rehypeSourceLines];

export const Preview = memo(function Preview({
  markdown,
  scrollRef,
  onCommentOnBlock,
  wide = false,
}: PreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Merge the internal container ref (needed for the comment affordance) with
  // the optional forwarded scrollRef (used by sync scroll).
  const setContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof scrollRef === "function") {
        scrollRef(node);
      } else if (scrollRef) {
        (scrollRef as { current: HTMLDivElement | null }).current = node;
      }
    },
    [scrollRef],
  );

  return (
    <div
      ref={setContainerRef}
      className="h-full overflow-y-auto p-5 md:p-7"
      style={{
        backgroundColor: "var(--term-bg-raised)",
        border: "1px solid var(--term-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        position: onCommentOnBlock ? "relative" : undefined,
      }}
    >
      {markdown ? (
        // Full-width box. In reading views the column is capped and centered so
        // long lines stay in a comfortable measure (like the typography plugin
        // default); in the workspace (`wide`) it fills the available pane.
        <div className={`prose prose-sm prose-invert mx-auto ${wide ? "max-w-none" : "max-w-[70ch]"}`}>
          <ReactMarkdown
            remarkPlugins={MARKDOWN_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
            components={MARKDOWN_COMPONENTS}
          >
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
      {onCommentOnBlock && (
        <CommentBlockAffordance containerRef={containerRef} onCommentOnBlock={onCommentOnBlock} />
      )}
    </div>
  );
});
