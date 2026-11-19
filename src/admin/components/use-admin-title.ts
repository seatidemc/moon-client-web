import { useEffect } from 'react'

export function useAdminPageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Moon 管理后台` : 'Moon 管理后台'
  }, [title])
}