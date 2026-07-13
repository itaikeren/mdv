import { memo } from "react";
import { Toggle } from "@base-ui-components/react/toggle";
import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import type { ViewMode } from "../utils/storage";

interface ModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const MODES: { key: ViewMode; label: string }[] = [
  { key: "split", label: "split" },
  { key: "edit", label: "edit" },
  { key: "preview", label: "preview" },
];

export const ModeToggle = memo(function ModeToggle({
  viewMode,
  onViewModeChange,
}: ModeToggleProps) {
  return (
    <ToggleGroup
      value={[viewMode]}
      onValueChange={(value) => {
        if (value.length > 0) onViewModeChange(value[0] as ViewMode);
      }}
      className="flex items-center gap-0.5 p-0.5"
      style={{
        backgroundColor: "var(--term-bg-surface)",
        borderRadius: "0",
        border: "1px solid var(--term-border)",
      }}
    >
      {MODES.map(({ key, label }) => {
        const active = viewMode === key;
        return (
          <Toggle
            key={key}
            value={key}
            aria-label={label}
            title={key}
            className="term-press px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer"
            style={{
              color: active ? "var(--term-btn-text)" : "var(--term-text-muted)",
              backgroundColor: active ? "var(--term-btn-bg)" : "transparent",
              borderRadius: "0",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
          >
            {label}
          </Toggle>
        );
      })}
    </ToggleGroup>
  );
});
