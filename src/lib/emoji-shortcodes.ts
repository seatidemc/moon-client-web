import { nameToEmoji } from 'gemoji'

/** Matches `:name:`; unknown names are left as-is. */
const SHORTCODE_PATTERN = /:([a-zA-Z0-9_+-]+):/g

/** Fenced code blocks and inline code, kept literal while replacing. */
const CODE_SPAN_PATTERN = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g

export function resolveEmojiShortcode(name: string): string | null {
  return nameToEmoji[name.toLowerCase()] ?? null
}

/** Replaces GitHub emoji shortcodes with their emoji. */
export function replaceEmojiShortcodes(text: string): string {
  return text.replace(
    SHORTCODE_PATTERN,
    (match, name: string) => resolveEmojiShortcode(name) ?? match,
  )
}

/**
 * Replaces shortcodes in Markdown while leaving fenced blocks and inline code
 * untouched, so code samples stay literal.
 */
export function replaceEmojiShortcodesInMarkdown(markdown: string): string {
  return markdown
    .split(CODE_SPAN_PATTERN)
    .map((part, index) =>
      index % 2 === 0 ? replaceEmojiShortcodes(part) : part,
    )
    .join('')
}