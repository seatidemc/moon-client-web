import { createContext, useContext } from 'react'

import type { Board, ForumThread, Reply, User } from '@/types'

export interface NewThreadInput {
  boardId: string
  title: string
  content: string
}

export interface NewReplyInput {
  threadId: string
  content: string
}

export interface UpdateThreadInput {
  title: string
  content: string
}

export interface ForumContextValue {
  users: User[]
  boards: Board[]
  threads: ForumThread[]
  replies: Reply[]
  userLikes: Record<string, string[]>
  userBackgrounds: Record<string, string>
  currentUser: User | null
  loginDialogOpen: boolean
  openLogin: (afterLogin?: () => void) => void
  closeLogin: () => void
  login: (identifier: string, password: string) => string | null
  logout: () => void
  createThread: (input: NewThreadInput) => ForumThread | null
  updateThread: (threadId: string, input: UpdateThreadInput) => void
  deleteThread: (threadId: string) => void
  createReply: (input: NewReplyInput) => Reply | null
  updateReply: (replyId: string, content: string) => void
  deleteReply: (replyId: string) => void
  toggleUserLike: (userId: string) => void
  setUserBackground: (userId: string, background: string | null) => void
}

export const ForumContext = createContext<ForumContextValue | null>(null)

export function useForum(): ForumContextValue {
  const context = useContext(ForumContext)
  if (!context) {
    throw new Error('useForum must be used within a ForumProvider')
  }

  return context
}
