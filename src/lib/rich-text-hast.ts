import type { Element, Root, RootContent, Text } from 'hast'

import { HASHTAG_PATTERN } from '@/lib/html-content'
import {
  REPLY_REFERENCE_PATTERN,
  type ReplyReferenceOptions,
} from '@/lib/reply-references'

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

function referenceAnchors(options: ReplyReferenceOptions) {
  return new Map<number, string>([
    [0, 'thread-post'],
    ...options.replies.map(
      (reply, index) => [index + 1, `reply-${reply.id}`] as const,
    ),
  ])
}

/** Splits `re#楼层号` into links to existing floors. */
function splitReferences(
  value: string,
  anchors: Map<number, string> | null,
  threadId: string | undefined,
): RootContent[] {
  if (!anchors || !threadId) return [text(value)]

  const nodes: RootContent[] = []
  let cursor = 0

  for (const match of value.matchAll(REPLY_REFERENCE_PATTERN)) {
    const floor = Number.parseInt(match[2], 10)
    const anchorId = anchors.get(floor)

    if (!anchorId) continue

    const start = (match.index ?? 0) + match[1].length
    const labelLength = match[0].length - match[1].length
    const label = value.slice(start, start + labelLength)

    if (start > cursor) nodes.push(text(value.slice(cursor, start)))

    nodes.push(
      link(
        {
          href: `/thread/${threadId}#${anchorId}`,
          title: `回复第 ${floor} 楼`,
          className: ['reply-reference'],
        },
        label,
      ),
    )

    cursor = start + labelLength
  }

  if (nodes.length === 0) return [text(value)]
  if (cursor < value.length) nodes.push(text(value.slice(cursor)))

  return nodes
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

function transformText(
  value: string,
  anchors: Map<number, string> | null,
  threadId: string | undefined,
): RootContent[] {
  return splitReferences(value, anchors, threadId).flatMap((node) =>
    node.type === 'text' ? splitHashtags(node.value) : [node],
  )
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
      next.push(...transformText(child.value, anchors, threadId))
      continue
    }

    if (child.type === 'element') {
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
 * Applies the rich-text-only features that are stored as plain text — hashtag
 * links and `re#楼层号` chips — to an HTML syntax tree before it is rendered.
 */
export function applyRichTextFeatures(
  tree: Root,
  options?: ReplyReferenceOptions,
) {
  const anchors = options ? referenceAnchors(options) : null

  transformChildren(tree, anchors, options?.threadId)
}