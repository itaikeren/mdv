import React, { memo, useCallback, useMemo, useRef } from "react";
import type { Ref, UIEventHandler } from "react";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onScroll?: UIEventHandler<HTMLTextAreaElement>;
}

interface WrapResult {
  newValue: string;
  newSelectionStart: number;
  newSelectionEnd: number;
}

function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
): WrapResult {
  const selected = value.slice(start, end);
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  return {
    newValue,
    newSelectionStart: start + before.length,
    newSelectionEnd: end + before.length,
  };
}

function wrapLink(value: string, start: number, end: number): WrapResult {
  const selected = value.slice(start, end);
  if (selected.length > 0) {
    const newValue = value.slice(0, start) + "[" + selected + "](url)" + value.slice(end);
    // Place cursor selecting "url"
    const urlStart = start + 1 + selected.length + 2;
    return {
      newValue,
      newSelectionStart: urlStart,
      newSelectionEnd: urlStart + 3,
    };
  }
  const newValue = value.slice(0, start) + "[](url)" + value.slice(end);
  // Place cursor inside []
  return {
    newValue,
    newSelectionStart: start + 1,
    newSelectionEnd: start + 1,
  };
}

export const Editor = memo(function Editor({
  value,
  onChange,
  placeholder = "# start typing...",
  textareaRef: externalTextareaRef,
  onScroll,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the internal ref (used for selection restore) while also exposing
  // the textarea to callers that need scroll access
  const mergedTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof externalTextareaRef === "function") {
        externalTextareaRef(node);
      } else if (externalTextareaRef) {
        externalTextareaRef.current = node;
      }
    },
    [externalTextareaRef],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const setSelectionAfterUpdate = useCallback((start: number, end: number) => {
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.selectionStart = start;
        ta.selectionEnd = end;
      }
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const { selectionStart, selectionEnd } = ta;

      // Tab support
      if (e.key === "Tab" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: remove up to 2 leading spaces from current line
          const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
          const lineText = value.slice(lineStart, selectionEnd);
          const spacesToRemove = lineText.startsWith("  ") ? 2 : lineText.startsWith(" ") ? 1 : 0;
          if (spacesToRemove > 0) {
            const newValue = value.slice(0, lineStart) + value.slice(lineStart + spacesToRemove);
            onChange(newValue);
            const newCursor = Math.max(lineStart, selectionStart - spacesToRemove);
            setSelectionAfterUpdate(newCursor, newCursor);
          }
        } else {
          // Tab: insert 2 spaces
          const newValue = value.slice(0, selectionStart) + "  " + value.slice(selectionEnd);
          onChange(newValue);
          const newCursor = selectionStart + 2;
          setSelectionAfterUpdate(newCursor, newCursor);
        }
        return;
      }

      // Keyboard shortcuts (Cmd/Ctrl + key)
      if (e.metaKey || e.ctrlKey) {
        let result: WrapResult | null = null;

        switch (e.key) {
          case "b": {
            e.preventDefault();
            result = wrapSelection(value, selectionStart, selectionEnd, "**", "**");
            break;
          }
          case "i": {
            e.preventDefault();
            result = wrapSelection(value, selectionStart, selectionEnd, "_", "_");
            break;
          }
          case "k": {
            e.preventDefault();
            result = wrapLink(value, selectionStart, selectionEnd);
            break;
          }
        }

        if (result) {
          onChange(result.newValue);
          setSelectionAfterUpdate(result.newSelectionStart, result.newSelectionEnd);
        }
      }
    },
    [value, onChange, setSelectionAfterUpdate],
  );

  const { wordCount, charCount } = useMemo(() => {
    const trimmed = value.trim();
    return {
      wordCount: trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length,
      charCount: value.length,
    };
  }, [value]);

  return (
    <div
      className="h-full flex flex-col transition-colors"
      style={{
        backgroundColor: "var(--term-bg-raised)",
        border: "1px solid var(--term-border)",
      }}
      onFocusCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--term-border-focus)";
      }}
      onBlurCapture={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--term-border)";
      }}
    >
      <textarea
        ref={mergedTextareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={onScroll}
        placeholder={placeholder}
        className="w-full flex-1 min-h-96 resize-none outline-none text-xs leading-relaxed p-4"
        style={{
          backgroundColor: "transparent",
          color: "var(--term-text-bright)",
          caretColor: "var(--term-green)",
        }}
      />
      <div
        className="text-[10px] px-3 py-1 flex items-center"
        style={{
          color: "var(--term-text-muted)",
          borderTop: "1px solid var(--term-border)",
        }}
      >
        <span style={{ color: "var(--term-green)", opacity: 0.5 }}>~</span>
        <span className="ml-1.5">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </span>
        <span className="mx-1.5" style={{ opacity: 0.3 }}>
          |
        </span>
        <span>
          {charCount} {charCount === 1 ? "char" : "chars"}
        </span>
      </div>
    </div>
  );
});
