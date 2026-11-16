import { Button, cn } from '@heroui/react'
import { Bell, BellOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { NotificationItem } from '@/components/NotificationItem'
import { useForum } from '@/lib/forum-context'
import { useNotifications } from '@/lib/notifications'
import { usePageTitle } from '@/lib/use-page-title'

type NotificationFilter = 'all' | 'unread'

export function NotificationsPage() {
  const { currentUser, openLogin, markNotificationsRead } = useForum()
  const { notifications, readIds, unreadCount } = useNotifications()
  const [filter, setFilter] = useState<NotificationFilter>('all')

  usePageTitle('通知')

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-[48rem] px-4 py-10 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight">通知</h1>
        <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
          <Bell className="mx-auto size-8 text-muted" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted">登录后查看你的通知。</p>
          <Button
            className="mt-5"
            variant="primary"
            onPress={() => openLogin()}
          >
            登录
          </Button>
        </div>
      </main>
    )
  }

  const visibleNotifications =
    filter === 'unread'
      ? notifications.filter((notification) => !readIds.has(notification.id))
      : notifications

  return (
    <main className="mx-auto w-full max-w-[48rem] px-4 py-10 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">通知</h1>
          <p className="mt-1 text-sm text-muted">
            {notifications.length === 0
              ? '收到回复或点赞后会显示在这里。'
              : unreadCount > 0
                ? `${unreadCount} 条未读通知`
                : '全部通知都已读'}
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onPress={() =>
              markNotificationsRead(
                notifications.map((notification) => notification.id),
              )
            }
          >
            全部标为已读
          </Button>
        ) : null}
      </header>

      <div
        role="group"
        className="mt-6 flex w-fit items-center gap-1 rounded-full bg-surface p-1"
        aria-label="通知筛选"
      >
        <FilterButton
          active={filter === 'all'}
          onPress={() => setFilter('all')}
        >
          全部
          <span className="text-xs text-muted tabular-nums">
            {notifications.length}
          </span>
        </FilterButton>
        <FilterButton
          active={filter === 'unread'}
          onPress={() => setFilter('unread')}
        >
          未读
          <span className="text-xs text-muted tabular-nums">{unreadCount}</span>
        </FilterButton>
      </div>

      <section
        className="mt-4 overflow-hidden rounded-2xl bg-surface"
        aria-label="通知列表"
      >
        {visibleNotifications.length > 0 ? (
          <div className="divide-y divide-border">
            {visibleNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                read={readIds.has(notification.id)}
                onSelect={() => markNotificationsRead([notification.id])}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <BellOff
              className="mx-auto size-8 text-muted"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm text-muted">
              {filter === 'unread'
                ? '没有未读通知。'
                : '还没有通知。收到回复或点赞后会出现在这里。'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

function FilterButton({
  active,
  onPress,
  children,
}: {
  active: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPress}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40',
        active
          ? 'bg-default text-foreground'
          : 'text-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}