import { useMemo } from 'react'

import { replyPostKey, threadPostKey, useForum } from '@/lib/forum-context'
import type { ForumData, Notification } from '@/types'

type NotificationSource = Pick<
  ForumData,
  'threads' | 'replies' | 'postLikes'
>

/**
 * 由现有的回复与点赞记录派生当前用户的通知，避免再维护一份会与
 * 原数据失步的通知列表。点赞时间没有单独记录，使用被赞内容的
 * 发布时间作为排序依据。
 */
export function buildNotifications(
  { threads, replies, postLikes }: NotificationSource,
  userId: string,
): Notification[] {
  const threadById = new Map(threads.map((thread) => [thread.id, thread]))
  const notifications: Notification[] = []

  for (const thread of threads) {
    if (thread.authorId !== userId) continue

    for (const actorId of postLikes[threadPostKey(thread.id)] ?? []) {
      if (actorId === userId) continue

      notifications.push({
        id: `like-thread:${thread.id}:${actorId}`,
        type: 'like-thread',
        actorId,
        threadId: thread.id,
        excerpt: thread.content,
        createdAt: thread.createdAt,
      })
    }
  }

  for (const reply of replies) {
    const thread = threadById.get(reply.threadId)
    if (!thread) continue

    if (thread.authorId === userId && reply.authorId !== userId) {
      notifications.push({
        id: `reply:${reply.id}`,
        type: 'reply',
        actorId: reply.authorId,
        threadId: thread.id,
        replyId: reply.id,
        excerpt: reply.content,
        createdAt: reply.createdAt,
      })
    }

    if (reply.authorId !== userId) continue

    for (const actorId of postLikes[replyPostKey(reply.id)] ?? []) {
      if (actorId === userId) continue

      notifications.push({
        id: `like-reply:${reply.id}:${actorId}`,
        type: 'like-reply',
        actorId,
        threadId: thread.id,
        replyId: reply.id,
        excerpt: reply.content,
        createdAt: reply.createdAt,
      })
    }
  }

  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function useNotifications() {
  const {
    threads,
    replies,
    postLikes,
    readNotificationIds,
    currentUser,
  } = useForum()

  const notifications = useMemo(
    () =>
      currentUser
        ? buildNotifications({ threads, replies, postLikes }, currentUser.id)
        : [],
    [currentUser, threads, replies, postLikes],
  )

  const readIds = useMemo(
    () => new Set(readNotificationIds),
    [readNotificationIds],
  )

  const unreadCount = useMemo(
    () =>
      notifications.reduce(
        (count, notification) => count + (readIds.has(notification.id) ? 0 : 1),
        0,
      ),
    [notifications, readIds],
  )

  return { notifications, readIds, unreadCount }
}