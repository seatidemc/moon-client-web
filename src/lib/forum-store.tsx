import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { seedData } from '@/data/seed'
import {
  DEMO_PASSWORD,
  FORUM_STORAGE_KEY,
  SESSION_STORAGE_KEY,
} from '@/lib/constants'
import {
  ForumContext,
  type ForumContextValue,
  type NewReplyInput,
  type NewThreadInput,
} from '@/lib/forum-context'
import { createId, extractTags } from '@/lib/utils'
import type { ForumData, ForumThread, Reply } from '@/types'

function isForumData(value: unknown): value is ForumData {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<ForumData>
  return (
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.boards) &&
    Array.isArray(candidate.threads) &&
    Array.isArray(candidate.replies)
  )
}

function normalizeUserLikes(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const userLikes: Record<string, string[]> = {}

  for (const [userId, likerIds] of Object.entries(value)) {
    if (!Array.isArray(likerIds)) continue

    userLikes[userId] = likerIds.filter(
      (likerId): likerId is string => typeof likerId === 'string',
    )
  }

  return userLikes
}

function normalizeUserBackgrounds(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const userBackgrounds: Record<string, string> = {}

  for (const [userId, background] of Object.entries(value)) {
    if (typeof background === 'string' && background) {
      userBackgrounds[userId] = background
    }
  }

  return userBackgrounds
}

function loadForumData(): ForumData {
  try {
    const stored = window.localStorage.getItem(FORUM_STORAGE_KEY)
    if (!stored) return seedData

    const parsed: unknown = JSON.parse(stored)
    if (!isForumData(parsed)) return seedData

    // Older saves predate likes and backgrounds, so fill in defaults instead of
    // dropping them.
    return {
      ...parsed,
      userLikes: normalizeUserLikes(parsed.userLikes),
      userBackgrounds: normalizeUserBackgrounds(parsed.userBackgrounds),
    }
  } catch {
    return seedData
  }
}

function loadSession(): string | null {
  try {
    return window.localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

function saveSession(userId: string | null) {
  try {
    if (userId) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, userId)
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  } catch {
    // A blocked localStorage should not prevent the forum from working.
  }
}

export function ForumProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ForumData>(loadForumData)
  const [currentUserId, setCurrentUserId] = useState<string | null>(loadSession)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const currentUser =
    data.users.find((user) => user.id === currentUserId) ?? null

  useEffect(() => {
    try {
      window.localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Keep the in-memory forum usable even when storage is unavailable.
    }
  }, [data])

  const value = useMemo<ForumContextValue>(() => {
    function openLogin(afterLogin?: () => void) {
      pendingActionRef.current = afterLogin ?? null
      setLoginDialogOpen(true)
    }

    function closeLogin() {
      pendingActionRef.current = null
      setLoginDialogOpen(false)
    }

    function login(identifier: string, password: string): string | null {
      const normalized = identifier.trim().toLocaleLowerCase('zh-CN')
      const user = data.users.find(
        (candidate) =>
          candidate.handle.toLocaleLowerCase('zh-CN') === normalized ||
          candidate.name.toLocaleLowerCase('zh-CN') === normalized,
      )

      if (!user) return '账号不存在，请使用下方演示账号登录。'
      if (password !== DEMO_PASSWORD) return '密码不正确。'

      const afterLogin = pendingActionRef.current
      pendingActionRef.current = null

      setCurrentUserId(user.id)
      saveSession(user.id)
      setLoginDialogOpen(false)
      afterLogin?.()

      return null
    }

    function logout() {
      setCurrentUserId(null)
      saveSession(null)
    }

    function createThread(input: NewThreadInput): ForumThread | null {
      if (!currentUser) return null

      const thread: ForumThread = {
        id: createId('thread'),
        boardId: input.boardId,
        authorId: currentUser.id,
        title: input.title.trim(),
        content: input.content,
        tags: extractTags(input.content),
        createdAt: new Date().toISOString(),
      }

      setData((previous) => ({
        ...previous,
        threads: [thread, ...previous.threads],
      }))

      return thread
    }

    function deleteThread(threadId: string) {
      if (!currentUser) return

      setData((previous) => {
        const thread = previous.threads.find((item) => item.id === threadId)
        if (!thread || thread.authorId !== currentUser.id) return previous

        return {
          ...previous,
          threads: previous.threads.filter((item) => item.id !== threadId),
          replies: previous.replies.filter((reply) => reply.threadId !== threadId),
        }
      })
    }

    function createReply(input: NewReplyInput): Reply | null {
      if (!currentUser) return null

      const reply: Reply = {
        id: createId('reply'),
        threadId: input.threadId,
        authorId: currentUser.id,
        content: input.content,
        createdAt: new Date().toISOString(),
      }

      setData((previous) => ({
        ...previous,
        replies: [...previous.replies, reply],
      }))

      return reply
    }

    function deleteReply(replyId: string) {
      if (!currentUser) return

      setData((previous) => ({
        ...previous,
        replies: previous.replies.filter(
          (reply) => !(reply.id === replyId && reply.authorId === currentUser.id),
        ),
      }))
    }

    function toggleUserLike(userId: string) {
      if (!currentUser) return

      const likerId = currentUser.id

      setData((previous) => {
        if (!previous.users.some((user) => user.id === userId)) return previous

        const likers = previous.userLikes[userId] ?? []
        const nextLikers = likers.includes(likerId)
          ? likers.filter((id) => id !== likerId)
          : [...likers, likerId]

        return {
          ...previous,
          userLikes: { ...previous.userLikes, [userId]: nextLikers },
        }
      })
    }

    function setUserBackground(userId: string, background: string | null) {
      setData((previous) => {
        if (!previous.users.some((user) => user.id === userId)) return previous

        const userBackgrounds = { ...previous.userBackgrounds }

        if (background) {
          userBackgrounds[userId] = background
        } else {
          delete userBackgrounds[userId]
        }

        return { ...previous, userBackgrounds }
      })
    }

    return {
      users: data.users,
      boards: data.boards,
      threads: data.threads,
      replies: data.replies,
      userLikes: data.userLikes,
      userBackgrounds: data.userBackgrounds,
      currentUser,
      loginDialogOpen,
      openLogin,
      closeLogin,
      login,
      logout,
      createThread,
      deleteThread,
      createReply,
      deleteReply,
      toggleUserLike,
      setUserBackground,
    }
  }, [currentUser, data, loginDialogOpen])

  return <ForumContext value={value}>{children}</ForumContext>
}
