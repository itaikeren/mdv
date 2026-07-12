// Shared helpers for line-anchored comments: scrolling the share page to a
// preview block or a comment thread, with a brief highlight flash. The share
// view scrolls with the window (not an inner container), so all offsets are
// computed against window scroll with the sticky header subtracted.

const FLASH_CLASS = "mdv-anchor-flash";
const FLASH_MS = 1200;

function headerOffset(): number {
  const header = document.querySelector("header");
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 80;
  return headerHeight + 24;
}

function flash(el: HTMLElement): void {
  el.classList.remove(FLASH_CLASS);
  // Force reflow so re-adding the class restarts the animation on repeat clicks.
  void el.offsetWidth;
  el.classList.add(FLASH_CLASS);
  window.setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS);
}

function scrollWindowTo(el: HTMLElement): void {
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset();
  window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
}

// The preview stamps data-line/data-line-end on many nested blocks. Prefer the
// block whose start line matches exactly; otherwise the smallest range that
// still contains the line (handles anchors that drifted after edits).
export function pickBlockForLine(blocks: ArrayLike<HTMLElement>, line: number): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestSpan = Infinity;
  for (let i = 0; i < blocks.length; i++) {
    const el = blocks[i];
    const start = Number(el.getAttribute("data-line"));
    if (!Number.isInteger(start)) continue;
    const end = Number(el.getAttribute("data-line-end")) || start;
    if (start === line) return el;
    if (line >= start && line <= end && end - start < bestSpan) {
      best = el;
      bestSpan = end - start;
    }
  }
  return best;
}

export function findBlockForLine(line: number): HTMLElement | null {
  return pickBlockForLine(document.querySelectorAll<HTMLElement>("[data-line]"), line);
}

export function scrollToBlockForLine(line: number): void {
  const target = findBlockForLine(line);
  if (!target) return;
  scrollWindowTo(target);
  flash(target);
}

export function scrollToCommentThread(commentId: string): void {
  const el = document.getElementById(`mdv-comment-${commentId}`);
  if (!el) return;
  scrollWindowTo(el);
  flash(el);
}
