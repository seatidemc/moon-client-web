import { Button, Tabs } from '@heroui/react'
import { Bell, BellOff } from 'lucide-react'
import { useState } from 'react'

import { LoadingState } from '@/components/LoadingState'
import { NotificationItem } from '@/components/NotificationItem'
import { useForum } from '@/lib/forum-context'
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadCount,
  type NotificationFilter,
} from '@/lib/notifications'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePageTitle } from '@/lib/use-page-title'

export function NotificationsPage() {
  const { currentUser, openLogin } = useForum()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const all = useNotifications('all')
  const unread = useNotifications('unread')
  const unreadCount = useUnreadCount().data ?? 0
  const markRead = useMarkNotificationsRead()

  usePageTitle('通知')

  const active = filter === 'all' ? all : unread
  const sentinelRef = useInfiniteScroll({
    hasNextPage: active.hasNextPage,
    isFetchingNextPage: active.isFetchingNextPage,
    fetchNextPage: active.fetchNextPage,
  })

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-[69.25rem] px-4 py-10 sm:py-12">
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

  return (
    <main className="mx-auto w-full max-w-[69.25rem] px-4 py-10 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">通知</h1>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) =>
            setFilter(key === 'unread' ? 'unread' : 'all')
          }
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="通知筛选">
              <Tabs.Tab id="all" className="gap-1.5 whitespace-nowrap">
                全部
                <span className="text-xs tabular-nums opacity-60">
                  {all.total}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="unread" className="gap-1.5 whitespace-nowrap">
                未读
                <span className="text-xs tabular-nums opacity-60">
                  {unreadCount}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        {unreadCount > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted"
            onPress={() => markRead.mutate({ all: true })}
          >
            全部标为已读
          </Button>
        ) : null}
      </div>

      <section
        className="mt-4 overflow-hidden rounded-2xl bg-surface"
        aria-label="通知列表"
      >
        {active.notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {active.notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                read={notification.read}
                onSelect={() => {
                  if (!notification.read) {
                    markRead.mutate({ ids: [notification.id] })
                  }
                }}
              />
            ))}
            <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          </div>
        ) : active.isPending ? (
          <LoadingState label="正在加载通知…" className="px-6 py-16" />
        ) : (
          <div className="px-6 py-16 text-center">
            <BellOff
              className="mx-auto size-8 text-muted"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm text-muted">
              {filter === 'unread'
                ? '没有未读通知'
                : '还没有通知，收到回复或点赞后会出现在这里'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}