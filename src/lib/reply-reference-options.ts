import { makeExcerpt } from '@/lib/utils'
import type { ForumThread, Reply, User } from '@/types'

const EXCERPT_LENGTH = 10

export interface ReplyReferenceOption {
  /** 0 表示主题帖本身 */
  floor: number
  name: string
  excerpt: string
}

/**
 * Builds the floor picker data for the reply editor. `threadReplies` must be
 * ordered the same way as the thread page (ascending floor number).
 */
export function buildReplyReferenceOptions(
  thread: ForumThread,
  threadReplies: Reply[],
  users: User[],
): ReplyReferenceOption[] {
  function authorName(authorId: string) {
    return users.find((user) => user.id === authorId)?.name ?? '未知用户'
  }

  return [
    {
      floor: 0,
      name: authorName(thread.authorId),
      excerpt: makeExcerpt(thread.content, EXCERPT_LENGTH),
    },
    ...threadReplies.map((reply, index) => ({
      floor: index + 1,
      name: authorName(reply.authorId),
      excerpt: makeExcerpt(reply.content, EXCERPT_LENGTH),
    })),
  ]
}