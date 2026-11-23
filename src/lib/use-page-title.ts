import { useEffect } from 'react'

import { useForum } from '@/lib/forum-context'

/**
 * 同步页面标题。传 null 表示先保持当前标题不变，用于数据加载中，
 * 避免先闪成默认站点标题。
 */
export function usePageTitle(title?: string | null) {
  const { site } = useForum()

  useEffect(() => {
    if (title === null) return

    document.title = title ? `${title} · ${site.siteName}` : site.siteName
  }, [site.siteName, title])
}