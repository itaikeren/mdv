import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";

export type ThemeMode = "dark" | "light";

const THEMES: Record<ThemeMode, "github-dark-default" | "github-light-default"> = {
  dark: "github-dark-default",
  light: "github-light-default",
};

// Cache for highlighted code to prevent duplicate work
const highlightCache = new Map<string, string>();

// Uses the JavaScript regex engine instead of the default wasm engine (saves a
// ~600kB wasm download). Created lazily on first highlight; language grammars
// load on demand so only the languages actually used are fetched.
let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [bundledThemes["github-dark-default"], bundledThemes["github-light-default"]],
      langs: [],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  }
  return highlighterPromise;
}

// Deduplicates concurrent grammar loads; resolves to the usable language id
// ("text" for languages shiki doesn't know).
const langLoads = new Map<string, Promise<string>>();

function ensureLanguage(highlighter: HighlighterCore, lang: string): Promise<string> {
  let load = langLoads.get(lang);
  if (!load) {
    const grammar = bundledLanguages[lang as keyof typeof bundledLanguages];
    load = grammar ? highlighter.loadLanguage(grammar).then(() => lang) : Promise.resolve("text");
    langLoads.set(lang, load);
  }
  return load;
}

function getCurrentThemeMode(): ThemeMode {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export async function highlightCode(code: string, lang: string, mode?: ThemeMode): Promise<string> {
  const themeName = THEMES[mode ?? getCurrentThemeMode()];
  const langKey = lang.toLowerCase();

  // Create cache key from code, language, and theme
  const cacheKey = `${langKey}:${themeName}:${code}`;

  // Check cache first
  const cached = highlightCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const highlighter = await getHighlighter();
  const resolvedLang = await ensureLanguage(highlighter, langKey);
  const result = highlighter.codeToHtml(code, {
    lang: resolvedLang,
    theme: themeName,
  });

  highlightCache.set(cacheKey, result);

  // Limit cache size to prevent memory issues (keep last 1000 items)
  if (highlightCache.size > 1000) {
    const firstKey = highlightCache.keys().next().value;
    if (firstKey) {
      highlightCache.delete(firstKey);
    }
  }

  return result;
}
