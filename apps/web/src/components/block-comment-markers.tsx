import { useLayoutEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { PublicComment } from "@mdv/shared";
import { pickBlockForLine, scrollToCommentThread } from "../utils/anchor-scroll";

// Absolute-positioned overlay of comment-count badges in the preview's left
// margin, one per block that has anchored threads. Positions are measured from
// the DOM (no per-block React components inside Preview) and recomputed on
// comments/content change and on resize.
interface BlockCommentMarkersProps {
  wrapRef: RefObject<HTMLDivElement | null>;
  comments: PublicComment[];
  // Changes whenever the rendered markdown changes, so positions are remeasured.
  contentKey: string;
}

interface Marker {
  top: number;
  count: number;
  firstCommentId: string;
}

export function BlockCommentMarkers({ wrapRef, comments, contentKey }: BlockCommentMarkersProps) {
  const [markers, setMarkers] = useState<Marker[]>([]);

  const anchored = useMemo(
    () => comments.filter((c) => c.parentId === null && c.anchorStartLine !== null),
    [comments],
  );

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || anchored.length === 0) {
      setMarkers([]);
      return;
    }

    const compute = () => {
      const w = wrapRef.current;
      if (!w) return;
      const blocks = w.querySelectorAll<HTMLElement>("[data-line]");
      const wrapTop = w.getBoundingClientRect().top;

      // Group by the enclosing block element, preserving comment order so the
      // first (earliest) comment on a block is the scroll target.
      const groups = new Map<HTMLElement, Marker>();
      for (const comment of anchored) {
        const block = pickBlockForLine(blocks, comment.anchorStartLine as number);
        if (!block) continue;
        const existing = groups.get(block);
        if (existing) {
          existing.count += 1;
        } else {
          const top = block.getBoundingClientRect().top - wrapTop + w.scrollTop;
          groups.set(block, { top, count: 1, firstCommentId: comment.id });
        }
      }

      setMarkers([...groups.values()]);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(wrap);
    window.addEventListener("resize", compute);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [wrapRef, anchored, contentKey]);

  if (markers.length === 0) return null;

  return (
    <>
      {markers.map((marker) => (
        <button
          key={marker.firstCommentId}
          type="button"
          onClick={() => scrollToCommentThread(marker.firstCommentId)}
          title={`${marker.count} comment${marker.count !== 1 ? "s" : ""} on this block`}
          aria-label={`${marker.count} comment${marker.count !== 1 ? "s" : ""} on this block`}
          style={{
            position: "absolute",
            top: marker.top - 2,
            left: 0,
            transform: "translateX(-50%)",
            minWidth: 18,
            height: 18,
            padding: "0 0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "inherit",
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1,
            color: "var(--term-btn-text)",
            background: "var(--term-green)",
            border: "none",
            cursor: "pointer",
            zIndex: 4,
            transition: "opacity 0.15s",
            opacity: 0.85,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
        >
          {marker.count}
        </button>
      ))}
    </>
  );
}
