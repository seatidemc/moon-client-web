import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Pin,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { ThreadCard } from '@/components/ThreadCard'
import { useForum } from '@/lib/forum-context'
import { readCookie, writeCookie } from '@/lib/utils'

const COLLAPSED_COOKIE = 'pinned-threads-collapsed'

interface PinnedThreadsProps {
  /** 只显示该板块的置顶；为空时显示全部（首页） */
  boardId?: string
}

export function PinnedThreads({ boardId }: PinnedThreadsProps) {
  const { threads } = useForum()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(
    () => readCookie(COLLAPSED_COOKIE) === '1',
  )

  const pinnedThreads = threads
    .filter(
      (thread) => thread.pinned && (!boardId || thread.boardId === boardId),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  // 不超过三张时与下方内容同宽并等分卡片，超过三张才铺满整屏横向滚动
  const isCarousel = pinnedThreads.length > 3

  if (pinnedThreads.length === 0) return null

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    writeCookie(COLLAPSED_COOKIE, next ? '1' : '0')
  }

  function scrollByCard(direction: -1 | 1) {
    const scroller = scrollerRef.current
    if (!scroller) return

    const card = scroller.querySelector<HTMLElement>('article')
    if (!card) return

    const row = rowRef.current
    const gap = row
      ? Number.parseFloat(getComputedStyle(row).columnGap)
      : Number.NaN
    const distance = card.offsetWidth + (Number.isFinite(gap) ? gap : 0)

    scroller.scrollBy({
      left: direction * distance,
      behavior: 'smooth',
    })
  }

  return (
    <section aria-labelledby="pinned-threads-heading">
      <div
        className="mx-auto flex w-full max-w-[69.25rem] items-center justify-between gap-3 px-4"
      >
        <h2
          id="pinned-threads-heading"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Pin className="size-4 text-muted" aria-hidden="true" />
          置顶
          <span className="text-xs font-normal text-muted">
            {pinnedThreads.length}
          </span>
        </h2>

        <div className="flex items-center gap-1">
          {isCarousel && (
            <div
              aria-hidden={collapsed}
              className={`hidden items-center gap-1 transition-opacity duration-150 sm:flex ${
                collapsed ? 'pointer-events-none opacity-0' : 'opacity-100'
              }`}
            >
              <button
                type="button"
                aria-label="向左滚动置顶主题"
                tabIndex={collapsed ? -1 : 0}
                onClick={() => scrollByCard(-1)}
                className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="向右滚动置顶主题"
                tabIndex={collapsed ? -1 : 0}
                onClick={() => scrollByCard(1)}
                className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls="pinned-threads-content"
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
        id="pinned-threads-content"
        inert={collapsed}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
          collapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            ref={scrollerRef}
            className={`mt-5 snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 ${
              isCarousel ? '' : 'mx-auto max-w-[69.25rem]'
            }`}
          >
            <div
              ref={rowRef}
              className={isCarousel ? 'flex w-max gap-5' : 'flex gap-5'}
            >
              {pinnedThreads.map((thread) => (
                <div
                  key={thread.id}
                  className={`w-[min(80vw,20rem)] shrink-0 snap-start ${
                    isCarousel ? '' : 'md:w-auto md:min-w-0 md:flex-1'
                  }`}
                >
                  <ThreadCard
                    thread={thread}
                    variant="compact"
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}