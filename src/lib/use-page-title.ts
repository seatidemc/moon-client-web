import { useEffect } from 'react'

import { useForum } from '@/lib/forum-context'

export function usePageTitle(title?: string | null) {
  const { site } = useForum()

  useEffect(() => {
    document.title = title ? `${title} · ${site.siteName}` : site.siteName
  }, [site.siteName, title])
}