import type { Element, Root, RootContent, Text } from 'hast'

import { HASHTAG_PATTERN } from '@/lib/html-content'
import type { ReplyReferenceOptions } from '@/lib/reply-references'

/** Elements whose text must not be rewritten. */
const SKIPPED_TAGS = new Set([
  'a',
  'code',
  'pre',
  'script',
  'style',
  'textarea',
])

function text(value: string): Text {
  return { type: 'text', value }
}

function link(
  properties: Element['properties'],
  label: string,
): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties,
    children: [text(label)],
  }
}

/** Floor stored on an atomic reply-reference chip, if the element is one. */
function chipFloor(element: Element): number | null {
  if (element.properties.dataTagType !== 'reply') {
    return null
  }

  const floor = Number.parseInt(String(element.properties.dataFloor ?? ''), 10)
  return Number.isFinite(floor) ? floor : null
}

function referenceLink(
  floor: number,
  anchors: Map<number, string> | null,
  threadId: string | undefined,
): Element | null {
  if (!anchors || !threadId) return null

  const anchorId = anchors.get(floor)
  if (!anchorId) return null

  return link(
    {
      href: `/thread/${threadId}#${anchorId}`,
      title: `回复第 ${floor} 楼`,
      className: ['reply-reference'],
    },
    `#${floor}`,
  )
}

function referenceAnchors(options: ReplyReferenceOptions) {
  return new Map<number, string>([
    [0, 'thread-post'],
    ...options.replies.map(
      (reply, index) => [index + 1, `reply-${reply.id}`] as const,
    ),
  ])
}

/** Username and profile id stored on an atomic mention chip. */
function mentionData(
  element: Element,
): { userId: string; handle: string } | null {
  if (element.properties.dataTagType !== 'mention') {
    return null
  }

  const userId = String(element.properties.dataUserId ?? '')
  const handle = String(element.properties.dataHandle ?? '')

  return userId && handle ? { userId, handle } : null
}

function mentionLink(element: Element): Element | null {
  const mention = mentionData(element)
  if (!mention) return null

  return link(
    { href: `/user/${mention.userId}`, className: ['mention'] },
    `@${mention.handle}`,
  )
}

/** Splits hashtags into links that search for the tag. */
function splitHashtags(value: string): RootContent[] {
  const nodes: RootContent[] = []
  let cursor = 0

  for (const match of value.matchAll(HASHTAG_PATTERN)) {
    const tag = match[2]
    const start = (match.index ?? 0) + match[1].length

    if (start > cursor) nodes.push(text(value.slice(cursor, start)))

    nodes.push(
      link(
        { href: `/search?q=${encodeURIComponent(`#${tag}`)}` },
        `#${tag}`,
      ),
    )

    cursor = start + tag.length + 1
  }

  if (nodes.length === 0) return [text(value)]
  if (cursor < value.length) nodes.push(text(value.slice(cursor)))

  return nodes
}

function transformChildren(
  parent: Root | Element,
  anchors: Map<number, string> | null,
  threadId: string | undefined,
) {
  if (!parent.children) return

  const next: RootContent[] = []

  for (const child of parent.children) {
    if (child.type === 'text') {
      next.push(...splitHashtags(child.value))
      continue
    }

    if (child.type === 'element') {
      // Mentions already carry their target user; render them as profile links.
      const mention = mentionLink(child)
      if (mention) {
        next.push(mention)
        continue
      }

      // Chips already carry their floor; never re-process their label.
      const floor = chipFloor(child)
      if (floor !== null) {
        next.push(referenceLink(floor, anchors, threadId) ?? child)
        continue
      }

      if (!SKIPPED_TAGS.has(child.tagName)) {
        transformChildren(child, anchors, threadId)
      }
      next.push(child)
      continue
    }

    next.push(child)
  }

  parent.children = next
}

/**
 * Links hashtags, turns floor-reference chips into links to their floors, and
 * turns mention chips into user profile links before the HTML syntax tree is
 * rendered.
 */
export function applyRichTextFeatures(
  tree: Root,
  options?: ReplyReferenceOptions,
) {
  const anchors = options ? referenceAnchors(options) : null

  transformChildren(tree, anchors, options?.threadId)
}