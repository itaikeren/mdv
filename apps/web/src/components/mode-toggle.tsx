import React, { memo } from 'react'
import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import type { ViewMode } from '../utils/storage'

interface ModeToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

const MODES: { key: ViewMode; label: string; icon: React.ReactElement }[] = [
  {
    key: 'split',
    label: 'Split',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18l10.5 0M9 22l10.5 0m0-18a2 2 0 012 2v14a2 2 0 01-2 2M9 4v18" />
      </svg>
    ),
  },
  {
    key: 'edit',
    label: 'Edit',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    key: 'preview',
    label: 'Preview',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  },
]

export const ModeToggle = memo(function ModeToggle({ viewMode, onViewModeChange }: ModeToggleProps) {
  return (
    <ToggleGroup
      value={[viewMode]}
      onValueChange={(value) => {
        if (value.length > 0) onViewModeChange(value[0] as ViewMode)
      }}
      className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl ring-1 ring-slate-200/50"
    >
      {MODES.map(({ key, label, icon }) => (
        <Toggle
          key={key}
          value={key}
          aria-label={label}
          title={label}
          className="px-2 py-1.5 md:px-4 md:py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors text-slate-600 hover:text-slate-900 hover:bg-white/50 data-[pressed]:bg-white data-[pressed]:text-slate-900 data-[pressed]:ring-1 data-[pressed]:ring-slate-200/50"
        >
          {icon}
          <span className="hidden md:inline">{label}</span>
        </Toggle>
      ))}
    </ToggleGroup>
  )
})