import React, { memo, useCallback } from 'react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const Editor = memo(function Editor({ value, onChange, placeholder = 'Type your markdown here...' }: EditorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className="h-full flex flex-col">
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="
          w-full h-full min-h-96 resize-none
          outline-none bg-white text-slate-900
          font-mono text-sm leading-relaxed
          p-6 rounded-xl
          focus:ring-2 focus:ring-slate-200
          border border-slate-200
          transition-all duration-200 placeholder:text-slate-400
        "
      />
    </div>
  )
})