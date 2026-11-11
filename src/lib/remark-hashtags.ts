import type { Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'

const HASHTAG_PATTERN =
  /(^|[^\p{L}\p{N}_#])#([\p{L}\p{N}_][\p{L}\p{N}_-]{0,23})/gu

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

function splitHashtags(value: string): RootContent[] | null {
  const nodes: RootContent[] = []
  let cursor = 0

  for (const match of value.matchAll(HASHTAG_PATTERN)) {
    const tag = match[2]
    const start = match.index + match[1].length

    if (start > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, start) })
    }

    nodes.push({
      type: 'link',
      url: `/search?q=${encodeURIComponent(`#${tag}`)}`,
      children: [{ type: 'text', value: `#${tag}` }],
    })

    cursor = start + tag.length + 1
  }

  if (nodes.length === 0) return null

  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) })
  }

  return nodes
}

function transformChildren(parent: Root | RootContent) {
  if (!('children' in parent)) return

  const children = parent.children as RootContent[]

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]

    if (child.type === 'text') {
      const replacement = splitHashtags(child.value)

      if (replacement) {
        children.splice(index, 1, ...replacement)
        index += replacement.length - 1
      }

      continue
    }

    if (SKIPPED_TYPES.has(child.type)) continue

    transformChildren(child)
  }
}

/**
 * Turns hashtags in text nodes into links that search for the tag.
 * Code, existing links and images are left untouched.
 */
export const remarkHashtags: Plugin<[], Root> = () => (tree) => {
  transformChildren(tree)
}