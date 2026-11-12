import type { Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'

import { replaceEmojiShortcodes } from '@/lib/emoji-shortcodes'

const SKIPPED_TYPES = new Set([
  'code',
  'inlineCode',
  'html',
  'link',
  'linkReference',
  'image',
  'imageReference',
  'definition',
])

function transformChildren(parent: Root | RootContent) {
  if (!('children' in parent)) return

  const children = parent.children as RootContent[]

  for (const child of children) {
    if (child.type === 'text') {
      child.value = replaceEmojiShortcodes(child.value)
      continue
    }

    if (SKIPPED_TYPES.has(child.type)) continue

    transformChildren(child)
  }
}

/**
 * Turns `:smile:` shortcodes in text nodes into emoji. Code, existing links
 * and images are left untouched so examples stay readable.
 */
export const remarkEmoji: Plugin<[], Root> = () => (tree) => {
  transformChildren(tree)
}