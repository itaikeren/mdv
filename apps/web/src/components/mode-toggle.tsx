import type { ViewMode } from '../utils/storage'

interface ModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ModeToggle({ viewMode, onViewModeChange }: ModeToggleProps) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: 'split', label: 'Split' },
    { key: 'edit', label: 'Edit' },
    { key: 'preview', label: 'Preview' }
  ]

  return (
    <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl ring-1 ring-slate-200/50">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onViewModeChange(key)}
          className={`
            px-4 py-2 text-sm font-medium rounded-lg
            ${viewMode === key 
              ? 'bg-white text-slate-900 ring-1 ring-slate-200/50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  )
}