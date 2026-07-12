// Rehype plugin that stamps markdown source line ranges onto block-level
// preview elements as data-line / data-line-end attributes. The sync-scroll
// hook uses these anchors to map editor scroll positions to preview positions.
//
// Typed structurally (hast/unist are not direct dependencies of this app);
// any hast element node satisfies these shapes.

interface HastPosition {
  start: { line: number };
  end: { line: number };
}

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: HastPosition;
}

// Block-level elements worth anchoring. `code` is stamped separately (only
// when it is the direct child of a `pre`) because the CodeBlock component
// replaces the pre/code pair and needs the line range on its own output.
const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "hr",
]);

function stamp(node: HastNode): void {
  if (!node.position) return;
  const properties = node.properties ?? {};
  properties["data-line"] = node.position.start.line;
  properties["data-line-end"] = node.position.end.line;
  node.properties = properties;
}

function visit(node: HastNode, parent: HastNode | null): void {
  if (node.type === "element" && node.tagName) {
    if (BLOCK_TAGS.has(node.tagName)) {
      stamp(node);
    } else if (node.tagName === "code" && parent?.type === "element" && parent.tagName === "pre") {
      stamp(node);
    }
  }
  if (node.children) {
    for (const child of node.children) {
      visit(child, node);
    }
  }
}

export function rehypeSourceLines(): (tree: HastNode) => void {
  return (tree) => {
    visit(tree, null);
  };
}
