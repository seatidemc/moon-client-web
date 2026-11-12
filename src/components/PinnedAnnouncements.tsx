import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pin,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { UserAvatar } from '@/components/UserAvatar'
import { pinnedAnnouncements } from '@/data/announcements'
import { useForum } from '@/lib/forum-context'
import {
  formatDateTime,
  formatRelativeTime,
  readCookie,
  writeCookie,
} from '@/lib/utils'

const COLLAPSED_COOKIE = 'pinned-announcements-collapsed'

export function PinnedAnnouncements() {
  const { users } = useForum()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(
    () => readCookie(COLLAPSED_COOKIE) === '1',
  )

  if (pinnedAnnouncements.length === 0) return null

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    writeCookie(COLLAPSED_COOKIE, next ? '1' : '0')
  }

  function scrollByPage(direction: -1 | 1) {
    const scroller = scrollerRef.current
    if (!scroller) return

    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  return (
    <section
      aria-labelledby="pinned-heading"
      className="mb-5 pt-10 sm:pt-12"
    >
      <div className="mx-auto flex w-full max-w-[69.25rem] items-center justify-between gap-3 px-4">
        <h2
          id="pinned-heading"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Pin className="size-4 text-muted" aria-hidden="true" />
          置顶
          <span className="text-xs font-normal text-muted">
            {pinnedAnnouncements.length}
          </span>
        </h2>

        <div className="flex items-center gap-1">
          <div
            aria-hidden={collapsed}
            className={`hidden items-center gap-1 transition-opacity duration-150 sm:flex ${
              collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              aria-label="向左滚动置顶信息"
              tabIndex={collapsed ? -1 : 0}
              onClick={() => scrollByPage(-1)}
              className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="向右滚动置顶信息"
              tabIndex={collapsed ? -1 : 0}
              onClick={() => scrollByPage(1)}
              className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="pinned-announcements-content"
            onClick={toggleCollapsed}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            {collapsed ? '展开' : '收起'}
            {collapsed ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        id="pinned-announcements-content"
        inert={collapsed}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={scrollerRef}
            className="mt-5 snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5"
          >
            <div className="flex w-max gap-5">
              {pinnedAnnouncements.map((announcement) => {
                const publisher = users.find(
                  (user) => user.id === announcement.publisherId,
                )

                return (
                  <article
                    key={announcement.id}
                    className="flex w-[min(80vw,20rem)] shrink-0 snap-start flex-col rounded-2xl bg-surface p-4"
                  >
                    <h3 className="text-lg leading-6 font-minecraft-sc">
                      {announcement.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-6 text-muted">
                      {announcement.content}
                    </p>

                    <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted">
                      {publisher ? (
                        <>
                          <UserAvatar user={publisher} className="size-5" />
                          <span className="truncate text-foreground">
                            {publisher.name}
                          </span>
                        </>
                      ) : (
                        <span className="truncate">未知发布者</span>
                      )}
                      <span aria-hidden="true">·</span>
                      <time
                        dateTime={announcement.publishedAt}
                        title={formatDateTime(announcement.publishedAt)}
                        className="shrink-0"
                      >
                        {formatRelativeTime(announcement.publishedAt)}
                      </time>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
