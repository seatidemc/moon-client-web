import type { Reply } from '@/types'

/** Atomic reference chips are spans marked with `data-tag-type="reply"`. */
const CHIP_TAG_PATTERN = /<span\b[^>]*\bdata-tag-type="reply"[^>]*>/gi
const CHIP_FLOOR_PATTERN = /\bdata-floor="(\d+)"/i

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

  for (const match of html.matchAll(CHIP_TAG_PATTERN)) {
    const floorMatch = CHIP_FLOOR_PATTERN.exec(match[0])
    if (!floorMatch) continue

    const floor = Number.parseInt(floorMatch[1], 10)

    if (floor <= maxFloor && !floors.includes(floor)) floors.push(floor)
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