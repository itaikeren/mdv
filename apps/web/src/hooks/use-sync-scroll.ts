import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

interface UseSyncScrollOptions {
  enabled: boolean;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  previewRef: RefObject<HTMLDivElement | null>;
  content: string;
}

type Pane = "editor" | "preview";

interface OffsetTable {
  // offsets[i] = pixel offset of the top of source line i+1 (content-relative);
  // the final entry is the total content height, so offsets.length = lines + 1
  offsets: number[];
  padTop: number;
}

interface PreviewAnchor {
  top: number;
  bottom: number;
  line: number; // 1-based start source line
  endLine: number; // exclusive end line (data-line-end + 1)
}

const REBUILD_DEBOUNCE_MS = 200;

function createMirror(): HTMLDivElement {
  const mirror = document.createElement("div");
  const style = mirror.style;
  style.position = "absolute";
  style.top = "0";
  style.left = "-99999px";
  style.visibility = "hidden";
  style.pointerEvents = "none";
  document.body.appendChild(mirror);
  return mirror;
}

// Measure the pixel offset of every source line by mirroring the textarea's
// text into a hidden div with identical width/font/padding/wrapping, one span
// per source line. Soft-wrapped lines occupy several visual rows, so this is
// the only reliable way to map source lines to pixels (naive scrollTop /
// lineHeight drifts by whole screens on long wrapped paragraphs).
function buildOffsetTable(textarea: HTMLTextAreaElement, mirror: HTMLDivElement): OffsetTable {
  const cs = getComputedStyle(textarea);
  const style = mirror.style;
  style.boxSizing = "border-box";
  style.width = `${textarea.clientWidth}px`;
  style.fontFamily = cs.fontFamily;
  style.fontSize = cs.fontSize;
  style.fontWeight = cs.fontWeight;
  style.letterSpacing = cs.letterSpacing;
  style.lineHeight = cs.lineHeight;
  style.tabSize = cs.tabSize;
  style.padding = cs.padding;
  style.border = "0";
  // Match textarea soft-wrap behavior (wraps at word boundaries, breaks
  // unbroken strings that overflow)
  style.whiteSpace = "pre-wrap";
  style.overflowWrap = "break-word";
  style.wordBreak = "normal";

  const lines = textarea.value.split("\n");
  const fragment = document.createDocumentFragment();
  const spans: HTMLSpanElement[] = [];
  for (let i = 0; i < lines.length; i++) {
    const span = document.createElement("span");
    const text = i < lines.length - 1 ? `${lines[i]}\n` : lines[i];
    // Zero-width space so an empty trailing line still produces a line box
    span.textContent = text === "" ? "\u200b" : text;
    fragment.appendChild(span);
    spans.push(span);
  }
  mirror.replaceChildren(fragment);

  const padTop = Number.parseFloat(cs.paddingTop);
  const padBottom = Number.parseFloat(cs.paddingBottom);
  const offsets: number[] = new Array(lines.length + 1);
  for (let i = 0; i < spans.length; i++) {
    offsets[i] = spans[i].offsetTop - padTop;
  }
  offsets[lines.length] = mirror.scrollHeight - padTop - padBottom;
  mirror.replaceChildren();
  return { offsets, padTop };
}

function collectAnchors(container: HTMLDivElement): PreviewAnchor[] {
  const containerTop = container.getBoundingClientRect().top;
  const scrollTop = container.scrollTop;
  const anchors: PreviewAnchor[] = [];
  for (const el of container.querySelectorAll<HTMLElement>("[data-line]")) {
    const line = Number(el.dataset.line);
    if (!Number.isFinite(line)) continue;
    const end = Number(el.dataset.lineEnd);
    const rect = el.getBoundingClientRect();
    const top = rect.top - containerTop + scrollTop;
    anchors.push({
      top,
      bottom: top + rect.height,
      line,
      endLine: (Number.isFinite(end) ? Math.max(end, line) : line) + 1,
    });
  }
  return anchors;
}

// scrollTop -> fractional 1-based source line at the top of the viewport
function lineFromEditorScroll(scrollTop: number, table: OffsetTable): number {
  const { offsets, padTop } = table;
  const lineCount = offsets.length - 1;
  const y = scrollTop - padTop;
  if (y <= 0 || lineCount <= 0) return 1;
  // Binary search: last index with offsets[i] <= y
  let lo = 0;
  let hi = lineCount - 1;
  let i = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= y) {
      i = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const cur = offsets[i];
  const next = offsets[i + 1];
  const frac = next > cur ? (y - cur) / (next - cur) : 0;
  return Math.min(i + 1 + frac, lineCount + 1);
}

function editorScrollFromLine(line: number, table: OffsetTable): number {
  const { offsets, padTop } = table;
  const lineCount = offsets.length - 1;
  if (lineCount <= 0) return 0;
  const clamped = Math.min(Math.max(line, 1), lineCount + 1);
  const i = Math.min(Math.floor(clamped) - 1, lineCount - 1);
  const frac = clamped - 1 - i;
  const cur = offsets[i];
  const next = offsets[i + 1];
  return cur + frac * (next - cur) + padTop;
}

// Fractional source line -> preview scrollTop, interpolating inside the
// anchored block covering the line, or across the gap between blocks
function previewScrollFromLine(line: number, anchors: PreviewAnchor[]): number | null {
  if (anchors.length === 0) return null;
  const first = anchors[0];
  if (line <= first.line) {
    return first.line > 1 ? ((line - 1) / (first.line - 1)) * first.top : 0;
  }
  // Anchors are non-decreasing by start line in document order; the last
  // match is also the deepest (nested lists/tables give finer granularity)
  let aIdx = 0;
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].line <= line) {
      aIdx = i;
    } else {
      break;
    }
  }
  const a = anchors[aIdx];
  if (line < a.endLine) {
    const span = a.endLine - a.line;
    const frac = span > 0 ? (line - a.line) / span : 0;
    return a.top + frac * (a.bottom - a.top);
  }
  const b = anchors[aIdx + 1];
  if (!b) return a.bottom;
  const gapLines = b.line - a.endLine;
  const frac = gapLines > 0 ? (line - a.endLine) / gapLines : 1;
  return a.bottom + frac * Math.max(b.top - a.bottom, 0);
}

// Preview scrollTop -> fractional source line (inverse of the above)
function lineFromPreviewScroll(scrollTop: number, anchors: PreviewAnchor[]): number | null {
  if (anchors.length === 0) return null;
  const first = anchors[0];
  if (scrollTop <= first.top) {
    return first.top > 0 ? 1 + (scrollTop / first.top) * (first.line - 1) : first.line;
  }
  let aIdx = 0;
  for (let i = 1; i < anchors.length; i++) {
    if (anchors[i].top <= scrollTop) aIdx = i;
  }
  const a = anchors[aIdx];
  if (scrollTop < a.bottom) {
    const frac = (scrollTop - a.top) / (a.bottom - a.top);
    return a.line + frac * (a.endLine - a.line);
  }
  const b = anchors[aIdx + 1];
  if (!b) return a.endLine;
  const gap = b.top - a.bottom;
  const frac = gap > 0 ? (scrollTop - a.bottom) / gap : 1;
  return a.endLine + frac * Math.max(b.line - a.endLine, 0);
}

// Bidirectional editor<->preview scroll sync for split mode. Maps scroll
// positions through source line numbers: the editor side uses a soft-wrap
// aware line->pixel offset table, the preview side uses the [data-line]
// anchors stamped by rehypeSourceLines. Only reacts to scroll events, so the
// editor/preview content divergence during fast typing (deferred preview
// value) is harmless.
export function useSyncScroll({
  enabled,
  editorRef,
  previewRef,
  content,
}: UseSyncScrollOptions): void {
  const [isLg, setIsLg] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const tableRef = useRef<OffsetTable | null>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const suppressRef = useRef<Pane | null>(null);
  const scheduleRebuildRef = useRef<(() => void) | null>(null);

  const active = enabled && isLg;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsLg(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!active) return;
    const textarea = editorRef.current;
    const preview = previewRef.current;
    if (!textarea || !preview) return;

    const mirror = createMirror();
    mirrorRef.current = mirror;
    let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

    const rebuild = () => {
      tableRef.current = buildOffsetTable(textarea, mirror);
    };
    const scheduleRebuild = () => {
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(rebuild, REBUILD_DEBOUNCE_MS);
    };
    rebuild();
    scheduleRebuildRef.current = scheduleRebuild;

    const resizeObserver = new ResizeObserver(scheduleRebuild);
    resizeObserver.observe(textarea);

    const setScrollTop = (el: HTMLElement, top: number, pane: Pane) => {
      const max = el.scrollHeight - el.clientHeight;
      const clamped = Math.max(0, Math.min(top, max));
      if (Math.abs(el.scrollTop - clamped) < 1) return;
      suppressRef.current = pane;
      el.scrollTop = clamped;
      // Pending scroll events dispatch before animation frame callbacks, so
      // releasing here reliably swallows the programmatic echo
      requestAnimationFrame(() => {
        if (suppressRef.current === pane) suppressRef.current = null;
      });
    };

    const onEditorScroll = () => {
      if (suppressRef.current === "editor") return;
      const table = tableRef.current;
      if (!table) return;
      const line = lineFromEditorScroll(textarea.scrollTop, table);
      const target = previewScrollFromLine(line, collectAnchors(preview));
      if (target !== null) setScrollTop(preview, target, "preview");
    };

    const onPreviewScroll = () => {
      if (suppressRef.current === "preview") return;
      const table = tableRef.current;
      if (!table) return;
      const line = lineFromPreviewScroll(preview.scrollTop, collectAnchors(preview));
      if (line !== null) setScrollTop(textarea, editorScrollFromLine(line, table), "editor");
    };

    textarea.addEventListener("scroll", onEditorScroll, { passive: true });
    preview.addEventListener("scroll", onPreviewScroll, { passive: true });

    return () => {
      textarea.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
      resizeObserver.disconnect();
      if (rebuildTimer) clearTimeout(rebuildTimer);
      scheduleRebuildRef.current = null;
      tableRef.current = null;
      suppressRef.current = null;
      mirror.remove();
      mirrorRef.current = null;
    };
  }, [active, editorRef, previewRef]);

  // Re-measure (debounced) as the user types; sync itself only happens on
  // scroll events, so a briefly stale table is harmless
  useEffect(() => {
    scheduleRebuildRef.current?.();
  }, [content]);
}
