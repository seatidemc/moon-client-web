/**
 * Standalone HTML export. Markdown is only a lossy conversion of the rich-text
 * document; this export keeps every attribute the editor authored.
 */

const EXPORT_STYLES = `
:root {
  color-scheme: light dark;
  --foreground: #18181b;
  --background: #fafafa;
  --muted: #71717a;
  --border: #e4e4e7;
  --border-secondary: #d4d4d8;
  --surface-secondary: #f4f4f5;
  --link: #2563eb;
  --accent: #2563eb;
  --accent-soft: color-mix(in oklab, var(--accent) 15%, var(--background));
  --accent-soft-hover: color-mix(in oklab, var(--accent) 20%, var(--background));
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground: #fafafa;
    --background: #18181b;
    --muted: #a1a1aa;
    --border: #3f3f46;
    --border-secondary: #52525b;
    --surface-secondary: #27272a;
    --link: #60a5fa;
    --accent: #60a5fa;
    --accent-soft: color-mix(in oklab, var(--accent) 12%, var(--background));
    --accent-soft-hover: color-mix(in oklab, var(--accent) 16%, var(--background));
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

main {
  width: 100%;
  max-width: 48rem;
  margin: 0 auto;
  padding: 3rem 1.25rem 5rem;
}

.moon-rich-text {
  color: var(--foreground);
  font-size: 0.9375rem;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.moon-rich-text > :first-child {
  margin-top: 0;
}

.moon-rich-text > :last-child {
  margin-bottom: 0;
}

.moon-rich-text p,
.moon-rich-text ul,
.moon-rich-text ol,
.moon-rich-text blockquote,
.moon-rich-text pre,
.moon-rich-text table,
.moon-rich-text hr {
  margin-block: 0.9em;
}

.moon-rich-text h1,
.moon-rich-text h2,
.moon-rich-text h3,
.moon-rich-text h4,
.moon-rich-text h5,
.moon-rich-text h6 {
  margin-block: 1.4em 0.5em;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.moon-rich-text h1 { font-size: 1.5em; }
.moon-rich-text h2 { font-size: 1.3em; }
.moon-rich-text h3 { font-size: 1.12em; }
.moon-rich-text h4 { font-size: 1em; }
.moon-rich-text h5 { font-size: 0.94em; }
.moon-rich-text h6 { color: var(--muted); font-size: 0.9em; }

.moon-rich-text ul {
  list-style: disc;
  padding-left: 1.35em;
}

.moon-rich-text ol {
  list-style: decimal;
  padding-left: 1.45em;
}

.moon-rich-text li + li {
  margin-top: 0.25em;
}

.moon-rich-text li > p {
  margin-block: 0;
}

.moon-rich-text a {
  color: var(--link);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

.moon-rich-text .reply-reference {
  display: inline-block;
  margin-inline: 0.1em;
  border-radius: 999px;
  background: var(--accent-soft);
  padding: 0.1em 0.55em;
  color: var(--accent);
  font-size: 0.95em;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  text-decoration: none;
  white-space: nowrap;
}

.moon-rich-text .reply-reference::before {
  content: "";
  display: inline-block;
  inline-size: 0.9em;
  block-size: 0.9em;
  margin-inline-end: 0.25em;
  vertical-align: -0.1em;
  background-color: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20v-7a4 4 0 0 0-4-4H4'/%3E%3Cpath d='m9 14-5-5 5-5'/%3E%3C/svg%3E")
    center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20v-7a4 4 0 0 0-4-4H4'/%3E%3Cpath d='m9 14-5-5 5-5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.moon-rich-text strong {
  font-weight: 600;
}

.moon-rich-text del,
.moon-rich-text s {
  color: var(--muted);
}

.moon-rich-text blockquote {
  border-left: 2px solid var(--border-secondary);
  padding-left: 0.9rem;
  color: var(--muted);
}

.moon-rich-text code {
  border: 1px solid var(--border);
  border-radius: 0.3rem;
  background: var(--surface-secondary);
  padding: 0.1em 0.35em;
  font-family: "SFMono-Regular", ui-monospace, "SF Mono", Menlo, Consolas,
    monospace;
  font-size: 0.875em;
}

.moon-rich-text pre {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface-secondary);
  padding: 0.85rem 1rem;
  font-size: 0.85em;
  line-height: 1.65;
}

.moon-rich-text pre code {
  border: 0;
  background: transparent;
  padding: 0;
  font-size: inherit;
}

.moon-rich-text hr {
  border: 0;
  border-top: 1px solid var(--border);
}

.moon-rich-text .tableWrapper {
  overflow-x: auto;
}

.moon-rich-text table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.92em;
}

.moon-rich-text th,
.moon-rich-text td {
  position: relative;
  box-sizing: border-box;
  min-width: 1em;
  border: 1px solid var(--border);
  padding: 0.4em 0.6em;
  text-align: left;
  vertical-align: top;
}

.moon-rich-text th > *,
.moon-rich-text td > * {
  margin-block: 0;
}

.moon-rich-text th {
  background: var(--surface-secondary);
  font-weight: 600;
}

.moon-rich-text img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
}

.moon-rich-text > img {
  display: block;
  margin-block: 0.9em;
}
`

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildHtmlDocument(content: string, title: string) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${EXPORT_STYLES}</style>
</head>
<body>
<main class="moon-rich-text">${content}</main>
</body>
</html>
`
}

function downloadFile(contents: string, fileName: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // 延迟释放，确保浏览器已经接住下载。
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** 把 Markdown 作为文件下载到本地。 */
export function downloadMarkdown(markdown: string, fileName = '正文.md') {
  downloadFile(markdown, fileName, 'text/markdown;charset=utf-8')
}

/** 把完整的富文本 HTML（含样式）作为文件下载到本地。 */
export function downloadHtml(
  content: string,
  title = '正文',
  fileName = '正文.html',
) {
  downloadFile(
    buildHtmlDocument(content, title),
    fileName,
    'text/html;charset=utf-8',
  )
}