import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { seedData } from '@/data/seed'
import {
  DEFAULT_BOARD_COLOR,
  DEFAULT_BOARD_ICON,
  isBoardIconName,
} from '@/lib/board-icons'
import {
  DEMO_PASSWORD,
  FORUM_STORAGE_KEY,
  SESSION_STORAGE_KEY,
} from '@/lib/constants'
import {
  ForumContext,
  replyPostKey,
  threadPostKey,
  type ForumContextValue,
  type NewReplyInput,
  type NewThreadInput,
  type UpdateThreadInput,
} from '@/lib/forum-context'
import { extractTags } from '@/lib/html-content'
import { findReplyTargetFloor } from '@/lib/reply-references'
import { createId } from '@/lib/utils'
import type { Board, ForumData, ForumThread, Reply } from '@/types'

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

type StoredBoard = Partial<Omit<Board, 'icon' | 'color'>> & {
  icon?: unknown
  color?: unknown
}

function normalizeBoards(value: unknown): Board[] {
  if (!Array.isArray(value)) return seedData.boards

  return value.flatMap((item): Board[] => {
    if (!item || typeof item !== 'object') return []

    const board = item as StoredBoard
    if (
      typeof board.id !== 'string' ||
      typeof board.name !== 'string' ||
      typeof board.description !== 'string'
    ) {
      return []
    }

    // Older saves predate board icons and colors, so fall back to the seed
    // values for known boards instead of dropping them.
    const seedBoard = seedData.boards.find(
      (candidate) => candidate.id === board.id,
    )

    return [
      {
        id: board.id,
        name: board.name,
        description: board.description,
        icon: isBoardIconName(board.icon)
          ? board.icon
          : (seedBoard?.icon ?? DEFAULT_BOARD_ICON),
        color:
          typeof board.color === 'string' && board.color
            ? board.color
            : (seedBoard?.color ?? DEFAULT_BOARD_COLOR),
      },
    ]
  })
}

function normalizeIdLists(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const lists: Record<string, string[]> = {}

  for (const [key, ids] of Object.entries(value)) {
    if (!Array.isArray(ids)) continue

    lists[key] = ids.filter((id): id is string => typeof id === 'string')
  }

  return lists
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
      boards: normalizeBoards(parsed.boards),
      userLikes: normalizeIdLists(parsed.userLikes),
      postLikes: normalizeIdLists(parsed.postLikes),
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

    function updateThread(threadId: string, input: UpdateThreadInput) {
      if (!currentUser) return

      setData((previous) => ({
        ...previous,
        threads: previous.threads.map((thread) =>
          thread.id === threadId && thread.authorId === currentUser.id
            ? {
                ...thread,
                title: input.title.trim(),
                content: input.content,
                tags: extractTags(input.content),
                updatedAt: new Date().toISOString(),
              }
            : thread,
        ),
      }))
    }

    function deleteThread(threadId: string) {
      if (!currentUser) return

      setData((previous) => {
        const thread = previous.threads.find((item) => item.id === threadId)
        if (!thread || thread.authorId !== currentUser.id) return previous

        const removedReplyIds = new Set(
          previous.replies
            .filter((reply) => reply.threadId === threadId)
            .map((reply) => reply.id),
        )
        const postLikes = { ...previous.postLikes }
        delete postLikes[threadPostKey(threadId)]
        for (const replyId of removedReplyIds) {
          delete postLikes[replyPostKey(replyId)]
        }

        return {
          ...previous,
          threads: previous.threads.filter((item) => item.id !== threadId),
          replies: previous.replies.filter(
            (reply) => !removedReplyIds.has(reply.id),
          ),
          postLikes,
        }
      })
    }

    function createReply(input: NewReplyInput): Reply | null {
      if (!currentUser) return null

      const threadReplyCount = data.replies.filter(
        (reply) => reply.threadId === input.threadId,
      ).length
      const replyToFloor = findReplyTargetFloor(
        input.content,
        threadReplyCount,
      )

      const reply: Reply = {
        id: createId('reply'),
        threadId: input.threadId,
        authorId: currentUser.id,
        content: input.content,
        replyToFloor: replyToFloor ?? undefined,
        createdAt: new Date().toISOString(),
      }

      setData((previous) => ({
        ...previous,
        replies: [...previous.replies, reply],
      }))

      return reply
    }

    function updateReply(replyId: string, content: string) {
      if (!currentUser) return

      setData((previous) => ({
        ...previous,
        replies: previous.replies.map((reply) => {
          if (reply.id !== replyId || reply.authorId !== currentUser.id) {
            return reply
          }

          const threadReplyCount = previous.replies.filter(
            (item) => item.threadId === reply.threadId,
          ).length

          return {
            ...reply,
            content,
            replyToFloor:
              findReplyTargetFloor(content, threadReplyCount) ?? undefined,
          }
        }),
      }))
    }

    function deleteReply(replyId: string) {
      if (!currentUser) return

      setData((previous) => {
        const reply = previous.replies.find((item) => item.id === replyId)
        if (!reply || reply.authorId !== currentUser.id) return previous

        const postLikes = { ...previous.postLikes }
        delete postLikes[replyPostKey(replyId)]

        return {
          ...previous,
          replies: previous.replies.filter((item) => item.id !== replyId),
          postLikes,
        }
      })
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

    function updateUserAvatar(userId: string, avatarUrl: string | null) {
      setData((previous) => {
        if (!previous.users.some((user) => user.id === userId)) return previous

        return {
          ...previous,
          users: previous.users.map((user) =>
            user.id === userId ? { ...user, avatarUrl: avatarUrl ?? undefined } : user,
          ),
        }
      })
    }

    function togglePostLike(postKey: string) {
      if (!currentUser) return

      const likerId = currentUser.id

      setData((previous) => {
        const likers = previous.postLikes[postKey] ?? []
        const nextLikers = likers.includes(likerId)
          ? likers.filter((id) => id !== likerId)
          : [...likers, likerId]

        return {
          ...previous,
          postLikes: { ...previous.postLikes, [postKey]: nextLikers },
        }
      })
    }

    function updateUserBio(userId: string, bio: string) {
      setData((previous) => {
        if (!previous.users.some((user) => user.id === userId)) return previous

        return {
          ...previous,
          users: previous.users.map((user) =>
            user.id === userId ? { ...user, bio: bio.trim() } : user,
          ),
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
      postLikes: data.postLikes,
      userBackgrounds: data.userBackgrounds,
      currentUser,
      loginDialogOpen,
      openLogin,
      closeLogin,
      login,
      logout,
      createThread,
      updateThread,
      deleteThread,
      createReply,
      updateReply,
      deleteReply,
      toggleUserLike,
      togglePostLike,
      setUserBackground,
      updateUserAvatar,
      updateUserBio,
    }
  }, [currentUser, data, loginDialogOpen])

  return <ForumContext value={value}>{children}</ForumContext>
}
