import { cn } from '@heroui/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { UserSummary } from '@/types'

interface UserBylineProps {
  user: UserSummary
  date?: string
  /** 覆盖日期区域的显示内容；仍以 date 作为 <time> 的值 */
  dateText?: ReactNode
  showHandle?: boolean
  avatarSize?: 'sm' | 'md' | 'lg'
  badge?: ReactNode
  className?: string
}

export function UserByline({
  user,
  date,
  dateText,
  showHandle = true,
  avatarSize = 'sm',
  badge,
  className,
}: UserBylineProps) {
  const displayName = getDisplayName(user)

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Link to={`/user/${user.id}`} aria-label={`查看 ${displayName} 的主页`}>
        <UserAvatar user={user} size={avatarSize} />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            to={`/user/${user.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {displayName}
          </Link>
          {badge}
          {showHandle ? (
            <span className="truncate text-xs text-muted">@{user.username}</span>
          ) : null}
        </div>
        {date ? (
          <time
            dateTime={date}
            title={formatDateTime(date)}
            className="text-xs text-muted"
          >
            {dateText ?? formatRelativeTime(date)}
          </time>
        ) : null}
      </div>
    </div>
  )
}