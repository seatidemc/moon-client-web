import { htmlToPlainText } from '@/lib/html-content'
import { getDisplayName } from '@/lib/user'
import type { Reply, ThreadSummary } from '@/types'

const EXCERPT_LENGTH = 16

export interface ReplyReferenceOption {
  /** 0 表示主题帖本身 */
  floor: number
  name: string
  excerpt: string
}

/**
 * Builds the floor picker data for the reply editor. Replies use their stable
 * server-assigned `floor`; deleted replies remain as placeholders so historical
 * references stay resolvable.
 */
export function buildReplyReferenceOptions(
  thread: ThreadSummary,
  threadReplies: Reply[],
): ReplyReferenceOption[] {
  return [
    {
      floor: 0,
      name: thread.author ? getDisplayName(thread.author) : '未知用户',
      excerpt: thread.excerpt,
    },
    ...[...threadReplies]
      .sort((a, b) => a.floor - b.floor)
      .map((reply) => {
        const text = reply.deleted
          ? ''
          : htmlToPlainText(reply.contentHtml ?? '')

        return {
          floor: reply.floor,
          name: reply.author ? getDisplayName(reply.author) : '已删除',
          excerpt:
            text.length > EXCERPT_LENGTH
              ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…`
              : text,
        }
      }),
  ]
}