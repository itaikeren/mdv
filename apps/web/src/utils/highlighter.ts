import { createHighlighter, type Highlighter } from 'shiki'

// Cache for highlighted code to prevent duplicate work
const highlightCache = new Map<string, string>()

// Eagerly initialize highlighter at module load time to avoid blocking on first use
// This runs in the background while the app is loading
let highlighterPromise: Promise<Highlighter> | null = null

function initHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light'], // Only load the theme we actually use
      langs: [
        'javascript',
        'typescript',
        'tsx',
        'jsx',
        'css',
        'html',
        'json',
        'markdown',
        'bash',
        'python',
        'java',
        'go',
        'rust',
        'php',
        'ruby'
      ]
    })
  }
  return highlighterPromise
}

// Start loading immediately at module import time
initHighlighter()

export async function getHighlighter(): Promise<Highlighter> {
  return initHighlighter()
}

export async function highlightCode(
  code: string,
  lang: string
): Promise<string> {
  // Currently only using github-light theme
  // To add dark mode: add a theme parameter, add 'github-dark' to themes array in initHighlighter()
  const themeName = 'github-light'

  // Create cache key from code, language, and theme
  const cacheKey = `${lang}:${themeName}:${code}`

  // Check cache first
  const cached = highlightCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Highlight and cache the result
  const shiki = await getHighlighter()
  const result = shiki.codeToHtml(code, {
    lang,
    theme: themeName
  })

  highlightCache.set(cacheKey, result)

  // Limit cache size to prevent memory issues (keep last 1000 items)
  if (highlightCache.size > 1000) {
    const firstKey = highlightCache.keys().next().value
    if (firstKey) {
      highlightCache.delete(firstKey)
    }
  }

  return result
}