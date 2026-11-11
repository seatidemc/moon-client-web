import { cn } from '@heroui/react'
import { Link } from 'react-router-dom'

import { UserAvatar } from '@/components/UserAvatar'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { User } from '@/types'

interface UserBylineProps {
  user: User
  date?: string
  showHandle?: boolean
  className?: string
}

export function UserByline({
  user,
  date,
  showHandle = true,
  className,
}: UserBylineProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <Link to={`/user/${user.id}`} aria-label={`查看 ${user.name} 的主页`}>
        <UserAvatar user={user} />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            to={`/user/${user.id}`}
            className="truncate text-sm font-medium hover:underline"
          >
            {user.name}
          </Link>
          {showHandle ? (
            <span className="truncate text-xs text-muted">@{user.handle}</span>
          ) : null}
        </div>
        {date ? (
          <time
            dateTime={date}
            title={formatDateTime(date)}
            className="text-xs text-muted"
          >
            {formatRelativeTime(date)}
          </time>
        ) : null}
      </div>
    </div>
  )
}
