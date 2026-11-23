import { useLocation } from 'react-router-dom'

import { useBoard, useThread } from '@/lib/queries'

/**
 * 从当前路由推导所属板块色：主题页取主题的板块，板块页取板块本身；
 * 其余页面为空，取用方应回退到全站默认色。
 */
export function useCurrentBoardColor() {
  const { pathname } = useLocation()
  const threadId = Number(/^\/thread\/(\d+)/.exec(pathname)?.[1] ?? 0)
  const topicSlug = /^\/topic\/([^/]+)/.exec(pathname)?.[1]
  const threadQuery = useThread(threadId)
  const boardQuery = useBoard(
    topicSlug ? decodeURIComponent(topicSlug) : undefined,
  )

  return threadQuery.data?.board.color ?? boardQuery.data?.color
}