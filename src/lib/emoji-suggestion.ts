import { gemoji } from 'gemoji'

export type EmojiSuggestionItem = {
  name: string
  emoji: string
  shortcodes: string[]
  tags: string[]
  group: string
}

/**
 * Emoji suggestions use GitHub shortcodes; a picked emoji is inserted as the
 * emoji character itself.
 */
export const emojiItems: EmojiSuggestionItem[] = gemoji.map((item) => ({
  name: item.names[0],
  emoji: item.emoji,
  shortcodes: item.names,
  tags: item.tags,
  group: item.category,
}))

/** A small, familiar set shown as soon as `:` is typed. */
const DEFAULT_SHORTCODES = [
  'smile',
  'joy',
  'heart',
  'thumbsup',
  'tada',
  'rocket',
  'thinking',
  'eyes',
]

const DEFAULT_ITEMS = DEFAULT_SHORTCODES.map((shortcode) =>
  emojiItems.find((item) => item.shortcodes.includes(shortcode)),
).filter((item): item is EmojiSuggestionItem => item !== undefined)

function rank(item: EmojiSuggestionItem, query: string): number | null {
  let best = Number.POSITIVE_INFINITY

  for (const shortcode of item.shortcodes) {
    if (shortcode === query) best = Math.min(best, 0)
    else if (shortcode.startsWith(query)) best = Math.min(best, 1)
    else if (shortcode.includes(query)) best = Math.min(best, 2)
  }

  for (const tag of item.tags) {
    if (tag.startsWith(query)) best = Math.min(best, 3)
    else if (tag.includes(query)) best = Math.min(best, 4)
  }

  return Number.isFinite(best) ? best : null
}

/** Partial shortcode/tag search, ranked so prefix matches come first. */
export function searchEmojiItems(
  query: string,
  limit = 8,
): EmojiSuggestionItem[] {
  const normalized = query.toLowerCase()

  if (!normalized) return DEFAULT_ITEMS.slice(0, limit)

  return emojiItems
    .map((item) => ({ item, score: rank(item, normalized) }))
    .filter(
      (entry): entry is { item: EmojiSuggestionItem; score: number } =>
        entry.score !== null,
    )
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.item.name.length - b.item.name.length ||
        a.item.name.localeCompare(b.item.name),
    )
    .slice(0, limit)
    .map((entry) => entry.item)
}