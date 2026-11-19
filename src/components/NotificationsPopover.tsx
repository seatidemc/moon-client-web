import { Button, Popover } from '@heroui/react'
import { Bell, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { NotificationItem } from '@/components/NotificationItem'
import { useForum } from '@/lib/forum-context'
import {
  useMarkNotificationsRead,
  useRecentNotifications,
  useUnreadCount,
} from '@/lib/notifications'

/** 顶部导航里的通知铃铛：未读时右上角显示红点。 */
export function NotificationsPopover() {
  const { currentUser } = useForum()
  const [open, setOpen] = useState(false)
  const recentQuery = useRecentNotifications()
  const unreadQuery = useUnreadCount()
  const markRead = useMarkNotificationsRead()

  const recent = recentQuery.data ?? []
  const unreadCount = unreadQuery.data ?? 0

  if (!currentUser) return null

  function markAllRead() {
    markRead.mutate({ all: true })
  }

  function handleSelect(id: number, read: boolean) {
    if (!read) markRead.mutate({ ids: [id] })
    setOpen(false)
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={
          unreadCount > 0 ? `通知，${unreadCount} 条未读` : '通知'
        }
        aria-haspopup="dialog"
        tabIndex={0}
        className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-default-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-surface"
            aria-hidden="true"
          />
        ) : null}
      </Popover.Trigger>

      <Popover.Content
        placement="bottom end"
        className="w-[22rem] max-w-[calc(100vw-2rem)]"
      >
        <Popover.Dialog
          aria-label="通知"
          className="overflow-hidden rounded-[inherit] p-0"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">通知</span>
              {unreadCount > 0 ? (
                <span className="min-w-4 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] leading-none font-medium text-danger-foreground tabular-nums">
                  {unreadCount}
                </span>
              ) : null}
            </div>

            {unreadCount > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted"
                onPress={markAllRead}
              >
                全部已读
              </Button>
            ) : null}
          </div>

          {recent.length > 0 ? (
            <div className="max-h-[27rem] divide-y divide-border overflow-y-auto overscroll-contain">
              {recent.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  read={notification.read}
                  compact
                  onSelect={() =>
                    handleSelect(notification.id, notification.read)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto size-6 text-muted" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted">还没有通知。</p>
            </div>
          )}

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-border px-4 py-2.5 text-xs text-muted transition-colors hover:bg-default-soft hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground/40"
          >
            查看全部通知
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}