import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Floating "+" affordance shown in the left margin of the preview block the
// pointer is over. Kept in its own component (not inside Preview) so hover
// state changes never re-render the markdown tree, which is expensive on long
// documents. Attaches a single delegated mouseover listener to the preview
// container rather than one listener per block.
interface CommentBlockAffordanceProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onCommentOnBlock: (startLine: number, endLine: number) => void;
}

interface HoverTarget {
  top: number;
  startLine: number;
  endLine: number;
}

export function CommentBlockAffordance({
  containerRef,
  onCommentOnBlock,
}: CommentBlockAffordanceProps) {
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const hoverRef = useRef<HoverTarget | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const block = target?.closest<HTMLElement>("[data-line]");
      // Ignore the affordance button itself and anything outside the preview.
      if (!block || !container.contains(block)) return;

      const startLine = Number(block.getAttribute("data-line"));
      if (!Number.isInteger(startLine) || startLine < 1) return;
      const endLine = Number(block.getAttribute("data-line-end")) || startLine;

      if (hoverRef.current?.startLine === startLine) return;

      const top =
        block.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop;

      const next = { top, startLine, endLine };
      hoverRef.current = next;
      setHover(next);
    };

    const handleLeave = () => {
      hoverRef.current = null;
      setHover(null);
    };

    container.addEventListener("mouseover", handleOver);
    container.addEventListener("mouseleave", handleLeave);
    return () => {
      container.removeEventListener("mouseover", handleOver);
      container.removeEventListener("mouseleave", handleLeave);
    };
  }, [containerRef]);

  if (!hover) return null;

  const label =
    hover.endLine > hover.startLine
      ? `L${hover.startLine}-${hover.endLine}`
      : `L${hover.startLine}`;

  return (
    <button
      type="button"
      title={`Comment on ${label}`}
      aria-label={`Comment on ${label}`}
      onClick={() => onCommentOnBlock(hover.startLine, hover.endLine)}
      style={{
        position: "absolute",
        top: hover.top - 2,
        left: 0,
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        fontSize: 13,
        lineHeight: 1,
        fontFamily: "inherit",
        color: "var(--term-btn-text)",
        background: "var(--term-btn-bg)",
        border: "none",
        cursor: "pointer",
        zIndex: 5,
        transition: "background-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
      }}
    >
      +
    </button>
  );
}
