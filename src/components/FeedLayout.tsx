import type { ReactNode } from 'react'

import { FeedSidebar } from '@/components/FeedSidebar'
import { PinnedThreads } from '@/components/PinnedThreads'

interface FeedLayoutProps {
  /** 只显示该板块的置顶与最近回复；为空时显示全部（首页） */
  boardId?: string
  /** 板块主题色，用于侧边栏发帖按钮 */
  boardColor?: string
  children: ReactNode
}

/**
 * 首页与板块页共用的 feed 结构：
 * 置顶三张以内与内容同宽等分，超过三张铺满整屏；内容/侧边栏两栏，置顶与下方内容统一间隔 5。
 */
export function FeedLayout({
  boardId,
  boardColor,
  children,
}: FeedLayoutProps) {
  return (
    <div className="space-y-5">
      <PinnedThreads boardId={boardId} />

      <div className="mx-auto w-full max-w-[69.25rem] px-4">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,48rem)_18rem]">
          <div className="space-y-5">{children}</div>

          <FeedSidebar boardId={boardId} boardColor={boardColor} />
        </div>
      </div>
    </div>
  )
}