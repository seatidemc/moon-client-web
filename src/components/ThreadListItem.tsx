import { TagList } from '@/components/TagList'
import { useForum } from '@/lib/forum-context'
import { formatDateTime, formatRelativeTime, makeExcerpt } from '@/lib/utils'
import type { ForumThread } from '@/types'
import { Link } from 'react-router-dom'

interface ThreadListItemProps {
  thread: ForumThread
  showBoard?: boolean
  showExcerpt?: boolean
}

export function ThreadListItem({
  thread,
  showExcerpt = true,
}: ThreadListItemProps) {
  const { users, replies } = useForum()
  const author = users.find((user) => user.id === thread.authorId)
  const replyCount = replies.filter((reply) => reply.threadId === thread.id).length

  return (
    <article className="py-5">
      <div className="flex items-baseline gap-2">
        <h2 className="min-w-0 text-base leading-6 font-medium">
          <Link
            to={`/thread/${thread.id}`}
            className="break-words hover:underline hover:underline-offset-4"
          >
            {thread.title}
          </Link>
        </h2>
      </div>

      {showExcerpt ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {makeExcerpt(thread.content)}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {author ? (
          <Link
            to={`/user/${author.id}`}
            className="hover:text-foreground"
          >
            {author.name}
          </Link>
        ) : (
          <span>未知用户</span>
        )}
        <time
          dateTime={thread.createdAt}
          title={formatDateTime(thread.createdAt)}
        >
          {formatRelativeTime(thread.createdAt)}
        </time>
        <span>{replyCount} 回复</span>
      </div>

      <TagList tags={thread.tags} className="mt-2" />
    </article>
  )
}
