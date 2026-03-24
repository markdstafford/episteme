import { createHighlighter, type Highlighter } from 'shiki'

const SUPPORTED_LANGUAGES = [
  'typescript', 'javascript', 'tsx', 'jsx',
  'python', 'rust', 'go', 'bash', 'sh',
  'json', 'yaml', 'toml', 'markdown',
  'sql', 'html', 'css', 'dockerfile',
] as const

let highlighterPromise: Promise<Highlighter> | null = null

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [{ default: latteTheme }, { default: mochaTheme }] = await Promise.all([
        import('@catppuccin/vscode/themes/latte.json'),
        import('@catppuccin/vscode/themes/mocha.json'),
      ])
      return createHighlighter({
        themes: [latteTheme, mochaTheme],
        langs: [...SUPPORTED_LANGUAGES],
      })
    })()
  }
  return highlighterPromise
}

