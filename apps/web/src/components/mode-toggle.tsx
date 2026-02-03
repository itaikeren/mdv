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
      className="flex items-center"
    >
      {MODES.map(({ key, label }) => (
        <Toggle
          key={key}
          value={key}
          aria-label={label}
          title={key}
          className="px-2 py-1 text-[10px] font-medium transition-colors cursor-pointer"
          style={{
            color: viewMode === key ? "var(--term-btn-text)" : "var(--term-text)",
            backgroundColor: viewMode === key ? "var(--term-btn-bg)" : "var(--term-btn-muted-bg)",
          }}
        >
          {label}
        </Toggle>
      ))}
    </ToggleGroup>
  );
});
