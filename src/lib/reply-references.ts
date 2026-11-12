/**
 * Matches `re#楼层号`. The leading boundary keeps it from matching inside
 * words such as `are#1`; floor 0 refers to the thread post itself.
 */
export const REPLY_REFERENCE_PATTERN = /(^|[^\p{L}\p{N}_])re#(\d+)/gu

/** Blanks out code so references written as examples are not treated as real. */
function withoutCode(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
}

/**
 * Returns the existing floors referenced by the markdown, in the order they
 * appear. `maxFloor` is the highest floor that currently exists.
 */
export function findReplyFloors(markdown: string, maxFloor: number): number[] {
  const floors: number[] = []

  for (const match of withoutCode(markdown).matchAll(REPLY_REFERENCE_PATTERN)) {
    const floor = Number.parseInt(match[2], 10)

    if (floor <= maxFloor && !floors.includes(floor)) floors.push(floor)
  }

  return floors
}

/**
 * The floor a post is replying to, stored as metadata. The first existing
 * reference wins; `null` means the post does not reference another floor.
 */
export function findReplyTargetFloor(
  markdown: string,
  maxFloor: number,
): number | null {
  return findReplyFloors(markdown, maxFloor)[0] ?? null
}