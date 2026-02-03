import { createContext } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

export type { Theme, ThemeContextValue };

export const ThemeContext = createContext<ThemeContextValue | null>(null);
