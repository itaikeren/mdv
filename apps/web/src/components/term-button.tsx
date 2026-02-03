import { memo, type ReactNode, type ButtonHTMLAttributes } from "react";

interface TermButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export const TermButton = memo(function TermButton({
  children,
  fullWidth,
  className = "",
  disabled,
  ...rest
}: TermButtonProps) {
  return (
    <button
      className={`px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${fullWidth ? "w-full" : ""} ${className}`}
      style={{
        backgroundColor: "var(--term-btn-bg)",
        color: "var(--term-btn-text)",
      }}
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = "var(--term-btn-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--term-btn-bg)";
      }}
      {...rest}
    >
      {children}
    </button>
  );
});
