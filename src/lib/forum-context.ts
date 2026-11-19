import { createContext, useContext } from 'react'

import type { Site, UserSummary } from '@/types'

export interface ForumContextValue {
  site: Site
  currentUser: UserSummary | null
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
  hasPermission: (code: string, boardId?: number | null) => boolean
  loginDialogOpen: boolean
  openLogin: (afterLogin?: () => void) => void
  closeLogin: () => void
  login: (username: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
}

export const ForumContext = createContext<ForumContextValue | null>(null)

export function useForum(): ForumContextValue {
  const context = useContext(ForumContext)
  if (!context) {
    throw new Error('useForum must be used within a ForumProvider')
  }

  return context
}