import { Tooltip } from '@heroui/react'

import { useForum } from '@/lib/forum-context'
import { formatDateTime, formatRelativeTime, makeExcerpt } from '@/lib/utils'
import type { ForumThread } from '@/types'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'

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
    <article className="relative rounded-2xl border-2 border-transparent bg-surface p-4 transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-surface-secondary active:scale-[0.98] active:bg-surface-tertiary active:duration-100 sm:p-5">
      <span className="absolute top-4 right-4 text-xs text-muted sm:top-5 sm:right-5">
        <span className="text-foreground">{replyCount}</span> 回复
      </span>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-16 sm:pr-20">
        <h2 className="min-w-0 text-xl leading-6 font-minecraft-sc">
          <Link
            to={`/thread/${thread.id}`}
            className="break-words outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-foreground/40"
          >
            {thread.title}
          </Link>
        </h2>

        {author ? (
          <Tooltip delay={0} closeDelay={0}>
            <Tooltip.Trigger className="relative z-10 shrink-0">
              <Link to={`/user/${author.id}`} aria-label={author.name}>
                <UserAvatar user={author} />
              </Link>
            </Tooltip.Trigger>
            <Tooltip.Content>{author.name}</Tooltip.Content>
          </Tooltip>
        ) : (
          <span className="text-xs text-muted">未知用户</span>
        )}
      </div>

      {showExcerpt ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
          {makeExcerpt(thread.content)}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <time
          dateTime={thread.createdAt}
          title={formatDateTime(thread.createdAt)}
        >
          {formatRelativeTime(thread.createdAt)}
        </time>
      </div>
    </article>
  )
}
