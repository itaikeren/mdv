import { createHighlighter, type Highlighter } from 'shiki'

let highlighter: Highlighter | null = null

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: [
        'vitesse-light',
        'vitesse-dark', 
        'github-light',
        'github-dark',
        'min-light',
        'min-dark'
      ],
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
  return highlighter
}

export async function highlightCode(
  code: string,
  lang: string,
  theme: 'light' | 'dark' = 'light'
): Promise<string> {
  const shiki = await getHighlighter()
  
  const themeName = theme === 'light' ? 'github-light' : 'github-dark'
  
  return shiki.codeToHtml(code, {
    lang,
    theme: themeName
  })
}