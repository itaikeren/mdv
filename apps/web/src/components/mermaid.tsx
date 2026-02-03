import { useEffect, useState, useMemo, memo } from "react";
import mermaid from "mermaid";
import { useTheme } from "../hooks/use-theme";

interface MermaidProps {
  chart: string;
  id?: string;
}

const FONT_FAMILY =
  "JetBrains Mono, 0xProto, SF Mono, Monaco, Cascadia Code, Consolas, Courier New, monospace";

export const Mermaid = memo(function Mermaid({ chart, id }: MermaidProps) {
  const { theme } = useTheme();
  const [svgContent, setSvgContent] = useState<string>("");
  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mermaidId = useMemo(
    () => id || `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    [id],
  );

  useEffect(() => {
    let isMounted = true;

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: FONT_FAMILY,
    });

    const renderDiagram = async () => {
      try {
        if (!isMounted) return;

        setError(null);
        setIsRendered(false);

        const { svg } = await mermaid.render(mermaidId, chart);

        if (isMounted) {
          setSvgContent(svg);
          setIsRendered(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Mermaid rendering error:", err);
          setError(err instanceof Error ? err.message : "Failed to render diagram");
          setIsRendered(false);
          setSvgContent("");
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, mermaidId, theme]);

  if (error) {
    return (
      <div
        className="my-4 p-3 border"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          borderColor: "var(--term-border)",
        }}
      >
        <div className="flex items-center mb-2 text-xs" style={{ color: "var(--term-red)" }}>
          err: diagram render failed
        </div>
        <pre
          className="text-[10px] p-2 overflow-x-auto"
          style={{
            backgroundColor: "var(--term-bg)",
            color: "var(--term-red)",
          }}
        >
          {error}
        </pre>
        <details className="mt-2">
          <summary
            className="text-[10px] cursor-pointer"
            style={{ color: "var(--term-text-muted)" }}
          >
            source
          </summary>
          <pre
            className="text-[10px] p-2 mt-1 overflow-x-auto"
            style={{
              backgroundColor: "var(--term-bg)",
              color: "var(--term-text)",
            }}
          >
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4 flex justify-center">
      <div
        className="w-full max-w-full overflow-x-auto border p-4"
        style={{
          backgroundColor: "var(--term-bg-surface)",
          borderColor: "var(--term-border)",
          minHeight: "200px",
        }}
      >
        {!isRendered && !error && (
          <div
            className="flex items-center justify-center h-32 text-xs"
            style={{ color: "var(--term-text-muted)" }}
          >
            rendering...
          </div>
        )}
        {isRendered && svgContent && (
          <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svgContent }} />
        )}
      </div>
    </div>
  );
});
