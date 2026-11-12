import { richTextSegments } from '@/lib/html-content'
import type { Reply } from '@/types'

/**
 * Matches `re#楼层号`. The leading boundary keeps it from matching inside
 * words such as `are#1`; floor 0 refers to the thread post itself.
 */
export const REPLY_REFERENCE_PATTERN = /(^|[^\p{L}\p{N}_])re#(\d+)/gu

export interface ReplyReferenceOptions {
  threadId: string
  /** 当前主题的跟帖，按楼层顺序排列 */
  replies: Reply[]
}

/**
 * Returns the existing floors referenced by the HTML content, in the order
 * they appear. `maxFloor` is the highest floor that currently exists.
 */
export function findReplyFloors(html: string, maxFloor: number): number[] {
  const floors: number[] = []

  for (const segment of richTextSegments(html)) {
    if (segment.inCode || segment.inLink) continue

    for (const match of segment.text.matchAll(REPLY_REFERENCE_PATTERN)) {
      const floor = Number.parseInt(match[2], 10)

      if (floor <= maxFloor && !floors.includes(floor)) floors.push(floor)
    }
  }

  return floors
}

/**
 * The floor a post is replying to, stored as metadata. The first existing
 * reference wins; `null` means the post does not reference another floor.
 */
export function findReplyTargetFloor(
  html: string,
  maxFloor: number,
): number | null {
  return findReplyFloors(html, maxFloor)[0] ?? null
}