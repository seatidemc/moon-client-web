import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

import { API_BASE } from '@/lib/constants'
import {
  notificationKeys,
  patchNotificationCaches,
} from '@/lib/notifications'
import {
  patchBoardCaches,
  patchReplyCaches,
  patchThreadCaches,
  queryKeys,
} from '@/lib/queries'
import type { Notification, Page, UserProfile } from '@/types'

interface ReadyPayload {
  unreadCount: number
}

interface NotificationPayload {
  notification: Notification
  unreadCount: number
}

interface NotificationReadPayload {
  unreadCount: number
  ids?: number[]
  all?: boolean
}

interface ThreadLikePayload {
  threadId: number
  likeCount: number
  actorId: number
  liked: boolean
}

interface ReplyLikePayload {
  threadId: number
  replyId: number
  likeCount: number
  actorId: number
  liked: boolean
}

interface UserLikePayload {
  userId: number
  profileLikeCount: number
  actorId: number
  liked: boolean
}

interface BoardFollowPayload {
  boardId: number
  boardSlug: string
  followerCount: number
  actorId: number
  following: boolean
}

interface InfinitePage<T> {
  pages: Page<T>[]
  pageParams: number[]
}

function parseEvent<T>(event: Event): T {
  return JSON.parse((event as MessageEvent<string>).data) as T
}

function upsertNotificationCaches(
  queryClient: QueryClient,
  notification: Notification,
) {
  queryClient.setQueryData<Notification[]>(notificationKeys.recent, (items) => {
    const rest = (items ?? []).filter((item) => item.id !== notification.id)
    return [notification, ...rest].slice(0, 5)
  })

  for (const key of [
    notificationKeys.list('all'),
    notificationKeys.list('unread'),
  ]) {
    queryClient.setQueryData<InfinitePage<Notification>>(key, (data) => {
      if (!data || data.pages.length === 0) return data

      const existed = data.pages.some((page) =>
        page.items.some((item) => item.id === notification.id),
      )
      const pages = data.pages.map((page, index) => {
        const total = existed ? page.total : page.total + 1
        if (index !== 0) {
          return {
            ...page,
            total,
            items: page.items.filter((item) => item.id !== notification.id),
          }
        }
        return {
          ...page,
          total,
          items: [
            notification,
            ...page.items.filter((item) => item.id !== notification.id),
          ].slice(0, page.pageSize),
        }
      })

      return { ...data, pages }
    })
  }
}

/**
 * 单连接实时通道：通知与内容互动事件共用一条 EventSource。
 * 仅在登录状态建立连接；退出登录时由 effect cleanup 关闭。
 */
export function useNotificationStream(userId: number | null | undefined) {
  const queryClient = useQueryClient()
  const openedOnce = useRef(false)

  useEffect(() => {
    if (!userId) return
    const uid = userId
    openedOnce.current = false

    const source = new EventSource(`${API_BASE}/events`, {
      withCredentials: true,
    })

    source.addEventListener('ready', (event) => {
      const data = parseEvent<ReadyPayload>(event)
      queryClient.setQueryData(notificationKeys.unreadCount, data.unreadCount)
      // 首连时页面自己的 REST 请求已在拉取；重连时补拉离线期间的事件。
      if (openedOnce.current) {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      }
      openedOnce.current = true
    })

    source.addEventListener('notification', (event) => {
      const data = parseEvent<NotificationPayload>(event)
      queryClient.setQueryData(notificationKeys.unreadCount, data.unreadCount)
      upsertNotificationCaches(queryClient, data.notification)
      // offset 分页前插后不立即重拉，避免分页错位；下次挂载/聚焦/重连时同步。
      void queryClient.invalidateQueries({
        queryKey: ['notifications'],
        refetchType: 'none',
      })
    })

    source.addEventListener('notification.read', (event) => {
      const data = parseEvent<NotificationReadPayload>(event)
      queryClient.setQueryData(notificationKeys.unreadCount, data.unreadCount)
      patchNotificationCaches(
        queryClient,
        data.all ? null : (data.ids ?? []),
      )
      void queryClient.invalidateQueries({
        queryKey: ['notifications', 'unread'],
      })
    })

    source.addEventListener('thread.like', (event) => {
      const data = parseEvent<ThreadLikePayload>(event)
      patchThreadCaches(queryClient, data.threadId, {
        likeCount: data.likeCount,
        ...(data.actorId === uid ? { likedByMe: data.liked } : {}),
      })
    })

    source.addEventListener('reply.like', (event) => {
      const data = parseEvent<ReplyLikePayload>(event)
      patchReplyCaches(queryClient, data.replyId, {
        likeCount: data.likeCount,
        ...(data.actorId === uid ? { likedByMe: data.liked } : {}),
      })
    })

    source.addEventListener('user.like', (event) => {
      const data = parseEvent<UserLikePayload>(event)
      queryClient.setQueryData<UserProfile>(queryKeys.user(data.userId), (user) =>
        user
          ? {
              ...user,
              profileLikeCount: data.profileLikeCount,
              ...(data.actorId === uid ? { likedByMe: data.liked } : {}),
            }
          : user,
      )
    })

    source.addEventListener('board.follow', (event) => {
      const data = parseEvent<BoardFollowPayload>(event)
      patchBoardCaches(queryClient, data.boardSlug, {
        followerCount: data.followerCount,
        ...(data.actorId === uid ? { followingByMe: data.following } : {}),
      })
    })

    // 连接断开由 EventSource 自动重连；ready 负责重新同步。
    return () => source.close()
  }, [queryClient, userId])
}