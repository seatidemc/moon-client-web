import { Tooltip, cn } from '@heroui/react'

import { useForum } from '@/lib/forum-context'
import { formatDateTime, formatRelativeTime, makeExcerpt } from '@/lib/utils'
import type { ForumThread } from '@/types'
import { Link } from 'react-router-dom'

import { BoardIcon } from '@/components/BoardIcon'
import { UserAvatar } from '@/components/UserAvatar'

type ThreadCardVariant = 'default' | 'compact'

interface ThreadCardProps {
  thread: ForumThread
  /** 在卡片右下角显示所属板块（图标 + 板块名） */
  showBoard?: boolean
  showExcerpt?: boolean
  /** compact：置顶卡片用的紧凑排布，作者信息收在卡片底部 */
  variant?: ThreadCardVariant
  className?: string
}

export function ThreadCard({
  thread,
  showBoard = false,
  showExcerpt = true,
  variant = 'default',
  className,
}: ThreadCardProps) {
  const { users, boards, replies } = useForum()
  const author = users.find((user) => user.id === thread.authorId)
  const replyCount = replies.filter((reply) => reply.threadId === thread.id).length
  const compact = variant === 'compact'

  const board = showBoard
    ? boards.find((item) => item.id === thread.boardId)
    : undefined

  const boardBadge = board ? (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      <BoardIcon icon={board.icon} color={board.color} className="size-3.5" />
      <span className="whitespace-nowrap">{board.name}</span>
    </span>
  ) : null

  const title = (
    <h2
      className={cn(
        'min-w-0 leading-6 font-minecraft-sc',
        compact ? 'text-lg' : 'text-xl',
      )}
    >
      <Link
        to={`/thread/${thread.id}`}
        className="break-words outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-foreground/40"
      >
        {thread.title}
      </Link>
    </h2>
  )

  const excerpt = showExcerpt ? (
    // flex 子项的 display 会被块化，line-clamp 将失效，所以由外层负责撑开
    <div className={cn('mt-1.5', compact && 'flex-1')}>
      <p className="line-clamp-2 text-sm leading-6 text-muted">
        {makeExcerpt(thread.content)}
      </p>
    </div>
  ) : null

  return (
    <article
      className={cn(
        'relative rounded-2xl border-2 border-transparent bg-surface transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-surface-secondary active:scale-[0.98] active:bg-surface-tertiary active:duration-100',
        compact ? 'flex flex-col p-4' : 'p-4 sm:p-5',
        className,
      )}
    >
      {compact ? null : (
        <span className="absolute top-4 right-4 text-xs text-muted sm:top-5 sm:right-5">
          <span className="text-foreground">{replyCount}</span> 回复
        </span>
      )}

      {compact ? (
        <>
          {title}
          {excerpt}

          <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted">
            {author ? (
              <>
                <UserAvatar user={author} className="size-5" />
                <span className="truncate text-foreground">{author.name}</span>
              </>
            ) : (
              <span className="truncate">未知用户</span>
            )}
            <span aria-hidden="true">·</span>
            <time
              dateTime={thread.createdAt}
              title={formatDateTime(thread.createdAt)}
              className="shrink-0"
            >
              {formatRelativeTime(thread.createdAt)}
            </time>
            {boardBadge}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-16 sm:pr-20">
            {title}

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

          {excerpt}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <time
              dateTime={thread.createdAt}
              title={formatDateTime(thread.createdAt)}
            >
              {formatRelativeTime(thread.createdAt)}
            </time>
            {boardBadge}
          </div>
        </>
      )}
    </article>
  )
}