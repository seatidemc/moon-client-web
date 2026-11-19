import { cn } from '@heroui/react'
import { AtSign, CornerUpLeft, Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { Notification } from '@/types'

interface NotificationItemProps {
  notification: Notification
  read: boolean
  compact?: boolean
  onSelect?: () => void
}

function notificationHref(notification: Notification): string {
  if (notification.replyId > 0) {
    return `/thread/${notification.threadId}#reply-${notification.replyId}`
  }

  return `/thread/${notification.threadId}`
}

function actionLabel(type: Notification['type']): string {
  switch (type) {
    case 'reply':
      return '回复了你的主题'
    case 'like_thread':
      return '赞了你的主题'
    case 'like_reply':
      return '赞了你的回复'
    case 'mention':
      return '提到了你'
  }
}

function NotificationIcon({ type }: { type: Notification['type'] }) {
  if (type === 'mention') return <AtSign className="size-2.5" />
  if (type === 'reply') return <CornerUpLeft className="size-2.5" />
  return <Heart className="size-2.5 fill-current" />
}

/** 通知中心与通知 popover 共用的单条通知。 */
export function NotificationItem({
  notification,
  read,
  compact = false,
  onSelect,
}: NotificationItemProps) {
  const actor = notification.actor

  if (!actor) return null

  const isLike =
    notification.type === 'like_thread' || notification.type === 'like_reply'
  // popover 里不放摘要，只保留动作和主题，列表更紧凑。
  const excerpt = compact ? '' : notification.excerpt

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
          <NotificationIcon type={notification.type} />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 text-sm leading-5">
            <span className="font-medium text-foreground">
              {getDisplayName(actor)}
            </span>{' '}
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
          {notification.threadTitle}
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