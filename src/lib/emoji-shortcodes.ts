import { nameToEmoji } from 'gemoji'

/** Matches `:name:`; unknown names are left as-is. */
const SHORTCODE_PATTERN = /:([a-zA-Z0-9_+-]+):/g

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