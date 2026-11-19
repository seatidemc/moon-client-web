import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { toast } from '@heroui/react'

import { buildQuery, isApiError, request } from '@/lib/api'
import { useForum } from '@/lib/forum-context'
import { flattenPages } from '@/lib/queries'
import type { Notification, Page } from '@/types'

export type NotificationFilter = 'all' | 'unread'

export const notificationKeys = {
  list: (filter: NotificationFilter) => ['notifications', filter] as const,
  recent: ['notifications', 'recent'] as const,
  unreadCount: ['unread-count'] as const,
}

interface InfinitePage<T> {
  pages: Page<T>[]
  pageParams: number[]
}

export function useNotificationFeed(
  filter: NotificationFilter,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam }) =>
      request<Page<Notification>>(
        `/notifications${buildQuery({ filter, page: pageParam, pageSize: 20 })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled,
  })
}

export function useNotifications(filter: NotificationFilter) {
  const { currentUser } = useForum()
  const query = useNotificationFeed(filter, Boolean(currentUser))

  return {
    ...query,
    notifications: flattenPages<Notification>(query.data),
    total: query.data?.pages[0]?.total ?? 0,
  }
}

/** 通知面板只展示最近 5 条。 */
export function useRecentNotifications() {
  const { currentUser } = useForum()

  return useQuery({
    queryKey: notificationKeys.recent,
    queryFn: async () => {
      const page = await request<Page<Notification>>(
        '/notifications?filter=all&page=1&pageSize=5',
      )
      return page.items
    },
    enabled: Boolean(currentUser),
    staleTime: 15_000,
  })
}

/** 未读数：每 30 秒轮询，窗口聚焦时刷新。 */
export function useUnreadCount() {
  const { currentUser } = useForum()

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const result = await request<{ count: number }>(
        '/notifications/unread-count',
      )
      return result.count
    },
    enabled: Boolean(currentUser),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

function patchNotificationCaches(
  queryClient: QueryClient,
  ids: number[] | null,
) {
  const idSet = ids ? new Set(ids) : null

  for (const query of queryClient.getQueryCache().findAll()) {
    const key = query.queryKey
    if (key[0] !== 'notifications') continue

    if (key[1] === 'recent') {
      queryClient.setQueryData<Notification[]>(key, (items) =>
        items?.map((item) =>
          idSet === null || idSet.has(item.id)
            ? { ...item, read: true }
            : item,
        ),
      )
      continue
    }

    const data = query.state.data as InfinitePage<Notification> | undefined
    if (!data) continue

    queryClient.setQueryData(key, {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((item) =>
          idSet === null || idSet.has(item.id)
            ? { ...item, read: true }
            : item,
        ),
      })),
    })
  }
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { ids?: number[]; all?: boolean }) =>
      request<{ unreadCount: number }>('/notifications/read', {
        method: 'POST',
        body: input,
      }),
    onMutate: async (input) => {
      const previousUnread = queryClient.getQueryData<number>(
        notificationKeys.unreadCount,
      )
      if (input.all) {
        patchNotificationCaches(queryClient, null)
        queryClient.setQueryData(notificationKeys.unreadCount, 0)
        return { previousUnread }
      }

      const ids = input.ids ?? []

      // 先统计当前缓存里确实未读的目标条目，再改缓存；否则会把已读状态提前算掉。
      const unreadIds = new Set<number>()
      for (const query of queryClient.getQueryCache().findAll()) {
        if (query.queryKey[0] !== 'notifications') continue
        const data = query.state.data as InfinitePage<Notification> | undefined
        for (const page of data?.pages ?? []) {
          for (const item of page.items) {
            if (!item.read && ids.includes(item.id)) unreadIds.add(item.id)
          }
        }
      }

      patchNotificationCaches(queryClient, ids)

      if (typeof previousUnread === 'number') {
        // 只有当前已加载的未读条目能精确扣减；完成后会以服务端计数为准。
        queryClient.setQueryData(
          notificationKeys.unreadCount,
          Math.max(0, previousUnread - unreadIds.size),
        )
      }

      return { previousUnread }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(
        notificationKeys.unreadCount,
        result.unreadCount,
      )
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.list('unread'),
      })
    },
    onError: (error, _input, context) => {
      if (!isApiError(error) || ![401, 403, 429].includes(error.status)) {
        toast.danger(
          error instanceof Error ? error.message : '操作失败，请稍后再试。',
        )
      }
      if (context && typeof context.previousUnread === 'number') {
        queryClient.setQueryData(
          notificationKeys.unreadCount,
          context.previousUnread,
        )
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount,
      })
    },
  })
}