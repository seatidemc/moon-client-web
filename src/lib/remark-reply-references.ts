import type { Root, RootContent } from 'mdast'
import type { Plugin } from 'unified'

import { REPLY_REFERENCE_PATTERN } from '@/lib/reply-references'
import type { Reply } from '@/types'

export interface ReplyReferenceOptions {
  threadId: string
  /** 当前主题的跟帖，按楼层顺序排列 */
  replies: Reply[]
}

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

function splitReferences(
  value: string,
  anchors: Map<number, string>,
  threadId: string,
): RootContent[] | null {
  const nodes: RootContent[] = []
  let cursor = 0

  for (const match of value.matchAll(REPLY_REFERENCE_PATTERN)) {
    const floorNumber = Number.parseInt(match[2], 10)
    const anchorId = anchors.get(floorNumber)

    if (!anchorId) continue

    const start = (match.index ?? 0) + match[1].length
    const label = match[0].slice(match[1].length)

    if (start > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, start) })
    }

    nodes.push({
      type: 'link',
      url: `/thread/${threadId}#${anchorId}`,
      title: `回复第 ${floorNumber} 楼`,
      data: {
        hProperties: {
          className: ['reply-reference'],
        },
      },
      children: [{ type: 'text', value: label }],
    })

    cursor = start + label.length
  }

  if (nodes.length === 0) return null

  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) })
  }

  return nodes
}

function transformChildren(
  parent: Root | RootContent,
  anchors: Map<number, string>,
  threadId: string,
) {
  if (!('children' in parent)) return

  const children = parent.children as RootContent[]

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]

    if (child.type === 'text') {
      const replacement = splitReferences(child.value, anchors, threadId)

      if (replacement) {
        children.splice(index, 1, ...replacement)
        index += replacement.length - 1
      }

      continue
    }

    if (SKIPPED_TYPES.has(child.type)) continue

    transformChildren(child, anchors, threadId)
  }
}

/**
 * Turns `re#楼层号` in reply text into links to that floor.
 * Floor 0 refers to the thread post itself.
 */
export const remarkReplyReferences: Plugin<[ReplyReferenceOptions], Root> =
  (options) => {
    const anchors = new Map<number, string>([
      [0, 'thread-post'],
      ...options.replies.map(
        (reply, index) => [index + 1, `reply-${reply.id}`] as const,
      ),
    ])

    return (tree) => {
      transformChildren(tree, anchors, options.threadId)
    }
  }