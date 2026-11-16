import { cn } from '@heroui/react'
import { CornerUpLeft, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'
import { useForum } from '@/lib/forum-context'
import { formatDateTime, formatRelativeTime, makeExcerpt } from '@/lib/utils'
import type { Notification } from '@/types'

interface NotificationItemProps {
  notification: Notification
  read: boolean
  compact?: boolean
  onSelect?: () => void
}

function notificationHref(notification: Notification): string {
  if (notification.type === 'like-thread') {
    return `/thread/${notification.threadId}`
  }

  return `/thread/${notification.threadId}#reply-${notification.replyId}`
}

function actionLabel(type: Notification['type']): string {
  switch (type) {
    case 'reply':
      return '回复了你的主题'
    case 'like-thread':
      return '赞了你的主题'
    case 'like-reply':
      return '赞了你的回复'
  }
}

/** 通知中心与通知 popover 共用的单条通知。 */
export function NotificationItem({
  notification,
  read,
  compact = false,
  onSelect,
}: NotificationItemProps) {
  const { users, threads } = useForum()
  const actor = users.find((user) => user.id === notification.actorId)
  const thread = threads.find((item) => item.id === notification.threadId)

  if (!actor || !thread) return null

  const isLike = notification.type !== 'reply'
  // popover 里不放摘要，只保留动作和主题，列表更紧凑。
  const excerpt = compact ? '' : makeExcerpt(notification.excerpt, 160)

  return (
    <Link
      to={notificationHref(notification)}
      onClick={onSelect}
      className={cn(
        'flex gap-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        compact ? 'px-3 py-2.5' : 'px-4 py-4 sm:px-5',
        read
          ? 'hover:bg-default-soft'
          : 'bg-accent-soft hover:bg-accent-soft-hover',
      )}
    >
      <span className="relative flex shrink-0 self-start">
        <UserAvatar user={actor} />
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-surface ring-1 ring-border',
            isLike ? 'text-danger' : 'text-accent',
          )}
          aria-hidden="true"
        >
          {isLike ? (
            <Heart className="size-2.5 fill-current" />
          ) : (
            <CornerUpLeft className="size-2.5" />
          )}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-sm leading-5">
            <span className="font-medium text-foreground">{actor.name}</span>{' '}
            <span className="text-muted">
              {actionLabel(notification.type)}
            </span>
          </span>
          <time
            dateTime={notification.createdAt}
            title={formatDateTime(notification.createdAt)}
            className="shrink-0 text-xs text-muted"
          >
            {formatRelativeTime(notification.createdAt)}
          </time>
        </span>

        <span className="mt-0.5 block truncate font-minecraft-sc text-sm text-foreground">
          {thread.title}
        </span>

        {excerpt ? (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted">
            {excerpt}
          </span>
        ) : null}
      </span>
    </Link>
  )
}