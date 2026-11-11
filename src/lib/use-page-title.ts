import { useEffect } from 'react'

import { SITE_NAME } from '@/lib/constants'

export function usePageTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  }, [title])
}
