import type { Reply } from '@/types'

/** Atomic reference chips store their floor on the `data-floor` attribute. */
const CHIP_FLOOR_PATTERN = /data-floor="(\d+)"/g

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

  for (const match of html.matchAll(CHIP_FLOOR_PATTERN)) {
    const floor = Number.parseInt(match[1], 10)

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