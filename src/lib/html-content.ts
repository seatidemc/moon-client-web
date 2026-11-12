/**
 * Helpers for treating post content as rich-text HTML (the editor's natural
 * format) rather than Markdown.
 */

/** Block-level elements that should be separated by whitespace in plain text. */
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dl',
  'dd',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
])

/** Elements whose contents are not part of the document's visible text. */
const SKIPPED_TAGS = new Set(['script', 'style', 'template'])

export interface RichTextSegment {
  text: string
  /** Code samples must not be treated as tags or reply references. */
  inCode: boolean
  /** Link labels are already intentional, so they are not re-processed. */
  inLink: boolean
}

export const HASHTAG_PATTERN =
  /(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_][\p{L}\p{N}_-]{0,23})/gu

function parseHtml(html: string): HTMLElement | null {
  if (typeof DOMParser === 'undefined') return null

  try {
    return new DOMParser().parseFromString(html, 'text/html').body
  } catch {
    return null
  }
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&amp;/gi, '&')
}

function fallbackPlainText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function collectPlainText(node: Node, parts: string[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.nodeValue ?? '')
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return

  const element = node as Element
  const tag = element.tagName.toLowerCase()

  if (SKIPPED_TAGS.has(tag)) return

  // `br` and images both represent a visual separation between text runs.
  if (tag === 'br') {
    parts.push(' ')
    return
  }

  if (tag === 'img') {
    const alt = element.getAttribute('alt')
    if (alt) parts.push(` ${alt} `)
    return
  }

  const block = BLOCK_TAGS.has(tag)
  if (block) parts.push(' ')

  for (const child of element.childNodes) collectPlainText(child, parts)

  if (block) parts.push(' ')
}

/**
 * Visible text of an HTML document, with block boundaries turned into spaces.
 * Used for excerpts, validation and search.
 */
export function htmlToPlainText(html: string): string {
  const body = parseHtml(html)
  if (!body) return fallbackPlainText(html)

  const parts: string[] = []
  for (const child of body.childNodes) collectPlainText(child, parts)

  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function hasRichTextContent(html: string): boolean {
  if (htmlToPlainText(html) !== '') return true

  // Media and tables are valid content even when they contain no text.
  const body = parseHtml(html)
  if (!body) return /<(?:img|table|video|audio|iframe)\b/i.test(html)

  return body.querySelector('img, table, video, audio, iframe') !== null
}

function collectSegments(
  node: Node,
  inCode: boolean,
  inLink: boolean,
  segments: RichTextSegment[],
) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? ''
    if (text) segments.push({ text, inCode, inLink })
    return
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return

  const element = node as Element
  const tag = element.tagName.toLowerCase()

  if (SKIPPED_TAGS.has(tag)) return

  const nextInCode = inCode || tag === 'code' || tag === 'pre'
  const nextInLink = inLink || tag === 'a'

  for (const child of element.childNodes) {
    collectSegments(child, nextInCode, nextInLink, segments)
  }
}

/**
 * Text runs with the context needed to avoid rewriting code samples or
 * existing links.
 */
export function richTextSegments(html: string): RichTextSegment[] {
  const body = parseHtml(html)
  if (!body) {
    return [{ text: fallbackPlainText(html), inCode: false, inLink: false }]
  }

  const segments: RichTextSegment[] = []
  for (const child of body.childNodes) {
    collectSegments(child, false, false, segments)
  }

  return segments
}

/** Distinct hashtags in document order, skipping code and existing links. */
export function extractTags(html: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const segment of richTextSegments(html)) {
    if (segment.inCode || segment.inLink) continue

    for (const match of segment.text.matchAll(HASHTAG_PATTERN)) {
      const tag = match[2]
      const key = tag.toLocaleLowerCase('zh-CN')

      if (!seen.has(key)) {
        seen.add(key)
        tags.push(tag)
      }
    }
  }

  return tags
}