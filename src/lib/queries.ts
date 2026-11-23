import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'

import { toast } from '@heroui/react'

import { buildQuery, isApiError, request } from '@/lib/api'
import {
  PAGE_SIZE,
  THREAD_LIST_PAGE_SIZE,
  USER_LIST_PAGE_SIZE,
} from '@/lib/constants'
import type {
  BoardSummary,
  FollowResult,
  LikeResult,
  Page,
  Reply,
  TagSummary,
  ThreadDetail,
  ThreadSummary,
  UserProfile,
  UserSummary,
  ItemsResponse,
  RecentReply,
} from '@/types'

export const queryKeys = {
  me: ['me'] as const,
  site: ['site'] as const,
  boards: ['boards'] as const,
  board: (slug: string) => ['board', slug] as const,
  threads: (boardSlug: string) => ['threads', boardSlug] as const,
  pinned: (boardSlug: string) => ['pinned', boardSlug] as const,
  recentReplies: (boardSlug: string) => ['recent-replies', boardSlug] as const,
  thread: (id: number) => ['thread', id] as const,
  replies: (id: number) => ['replies', id] as const,
  user: (id: number) => ['user', id] as const,
  userThreads: (id: number, page: number) =>
    ['user-threads', id, page] as const,
  userReplies: (id: number, page: number) =>
    ['user-replies', id, page] as const,
  mentionUsers: (query: string) => ['mention-users', query] as const,
  search: (query: string, boardSlug: string) =>
    ['search', query, boardSlug] as const,
  tags: (boardSlug: string) => ['tags', boardSlug] as const,
} as const

interface InfinitePage<T> {
  pages: Page<T>[]
  pageParams: number[]
}

export function flattenPages<T>(
  data: { pages: Page<T>[] } | undefined,
): T[] {
  return data?.pages.flatMap((page) => page.items) ?? []
}

function nextPage<T>(last: Page<T>) {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined
}

/** 401/403/429 已由全局处理器反馈，避免重复 toast。 */
function toastMutationError(error: unknown) {
  if (isApiError(error) && [401, 403, 429].includes(error.status)) return
  toast.danger(
    error instanceof Error ? error.message : '操作失败，请稍后再试。',
  )
}

const THREAD_LIST_KEYS = new Set([
  'threads',
  'pinned',
  'search',
  'user-threads',
])

function patchNestedItems<T extends { id: number }>(
  queryClient: QueryClient,
  topKeys: Set<string>,
  id: number,
  patch: Partial<T>,
) {
  for (const query of queryClient.getQueryCache().findAll()) {
    const key = query.queryKey
    if (typeof key[0] !== 'string' || !topKeys.has(key[0])) continue

    const data = query.state.data as
      | InfinitePage<T>
      | Page<T>
      | T[]
      | undefined
    if (!data) continue

    if (Array.isArray(data)) {
      queryClient.setQueryData(
        key,
        data.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      )
      continue
    }

    if ('items' in data) {
      queryClient.setQueryData(key, {
        ...data,
        items: data.items.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      })
      continue
    }

    if ('pages' in data) {
      queryClient.setQueryData(key, {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      })
    }
  }
}

export function patchThreadCaches(
  queryClient: QueryClient,
  threadId: number,
  patch: Partial<ThreadSummary>,
) {
  queryClient.setQueryData<ThreadDetail>(
    queryKeys.thread(threadId),
    (thread) => (thread ? { ...thread, ...patch } : thread),
  )
  patchNestedItems<ThreadSummary>(
    queryClient,
    THREAD_LIST_KEYS,
    threadId,
    patch,
  )
}

const REPLY_LIST_KEYS = new Set(['replies', 'user-replies'])

export function patchReplyCaches(
  queryClient: QueryClient,
  replyId: number,
  patch: Partial<Reply>,
) {
  patchNestedItems<Reply>(queryClient, REPLY_LIST_KEYS, replyId, patch)
}

function invalidateContentViews(queryClient: QueryClient) {
  for (const key of [
    'threads',
    'pinned',
    'search',
    'user-threads',
    'replies',
    'user-replies',
    'recent-replies',
    'tags',
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] })
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useBoards() {
  return useQuery({
    queryKey: queryKeys.boards,
    queryFn: () => request<BoardSummary[]>('/boards'),
    staleTime: 60_000,
  })
}

export function useBoard(slug: string | undefined) {
  return useQuery({
    queryKey: queryKeys.board(slug ?? ''),
    queryFn: () => request<BoardSummary>(`/boards/${encodeURIComponent(slug!)}`),
    enabled: Boolean(slug),
    staleTime: 60_000,
  })
}

export function useThreads(boardSlug?: string) {
  const board = boardSlug ?? ''
  return useInfiniteQuery({
    queryKey: queryKeys.threads(board),
    queryFn: ({ pageParam }) =>
      request<Page<ThreadSummary>>(
        `/threads${buildQuery({ board, page: pageParam, pageSize: THREAD_LIST_PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  })
}

export function usePinnedThreads(boardSlug?: string) {
  const board = boardSlug ?? ''
  return useQuery({
    queryKey: queryKeys.pinned(board),
    queryFn: async () => {
      const page = await request<Page<ThreadSummary>>(
        `/pinned-threads${buildQuery({ board, pageSize: 50 })}`,
      )
      return page.items
    },
    staleTime: 30_000,
  })
}

export function useThread(id: number) {
  return useQuery({
    queryKey: queryKeys.thread(id),
    queryFn: () => request<ThreadDetail>(`/threads/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useThreadReplies(id: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.replies(id),
    queryFn: ({ pageParam }) =>
      request<Page<Reply>>(
        `/threads/${id}/replies${buildQuery({ page: pageParam, pageSize: PAGE_SIZE })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useRecentReplies(boardSlug?: string) {
  const board = boardSlug ?? ''
  return useQuery({
    queryKey: queryKeys.recentReplies(board),
    queryFn: async () => {
      const result = await request<ItemsResponse<RecentReply>>(
        `/recent-replies${buildQuery({ board, limit: 5 })}`,
      )
      return result.items
    },
    staleTime: 30_000,
  })
}

export function useUserProfile(id: number) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => request<UserProfile>(`/users/${id}`),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useUserThreads(id: number, page: number) {
  return useQuery({
    queryKey: queryKeys.userThreads(id, page),
    queryFn: () =>
      request<Page<ThreadSummary>>(
        `/users/${id}/threads${buildQuery({ page, pageSize: USER_LIST_PAGE_SIZE })}`,
      ),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useUserReplies(id: number, page: number) {
  return useQuery({
    queryKey: queryKeys.userReplies(id, page),
    queryFn: () =>
      request<Page<Reply>>(
        `/users/${id}/replies${buildQuery({ page, pageSize: USER_LIST_PAGE_SIZE })}`,
      ),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useSearchThreads(query: string, boardSlug?: string) {
  const trimmed = query.trim()
  const board = boardSlug ?? ''
  return useInfiniteQuery({
    queryKey: queryKeys.search(trimmed, board),
    queryFn: ({ pageParam }) =>
      request<Page<ThreadSummary>>(
        `/search${buildQuery({
          q: trimmed,
          board,
          page: pageParam,
          pageSize: PAGE_SIZE,
        })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    enabled: trimmed !== '',
  })
}

export function useHotTags(boardSlug?: string) {
  const board = boardSlug ?? ''
  return useQuery({
    queryKey: queryKeys.tags(board),
    queryFn: async () => {
      const result = await request<ItemsResponse<TagSummary>>(
        `/tags${buildQuery({ board, limit: 8 })}`,
      )
      return result.items
    },
    staleTime: 60_000,
  })
}

export function useMentionCandidates(query: string) {
  const trimmed = query.trim()
  return useQuery({
    queryKey: queryKeys.mentionUsers(trimmed),
    queryFn: async () => {
      const result = await request<ItemsResponse<UserSummary>>(
        `/users/search${buildQuery({ q: trimmed, limit: 10 })}`,
      )
      return result.items
    },
    enabled: trimmed.length >= 1 && trimmed.length <= 32,
    staleTime: 30_000,
    retry: false,
  })
}

// ---------------------------------------------------------------------------
// Thread mutations
// ---------------------------------------------------------------------------

export function useCreateThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      boardId: number
      title: string
      contentHtml: string
    }) => request<ThreadDetail>('/threads', { method: 'POST', body: input }),
    onSuccess: (thread) => {
      queryClient.setQueryData(queryKeys.thread(thread.id), thread)
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['pinned'] })
      void queryClient.invalidateQueries({ queryKey: ['user-threads'] })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['board'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useUpdateThread(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { title?: string; contentHtml?: string }) =>
      request<ThreadDetail>(`/threads/${threadId}`, {
        method: 'PATCH',
        body: input,
      }),
    onError: (error) => toastMutationError(error),
    onSuccess: (thread) => {
      queryClient.setQueryData(queryKeys.thread(threadId), thread)
      patchThreadCaches(queryClient, threadId, {
        title: thread.title,
      })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
      void queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useDeleteThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (threadId: number) =>
      request<void>(`/threads/${threadId}`, { method: 'DELETE' }),
    onError: (error) => toastMutationError(error),
    onSuccess: (_data, threadId) => {
      queryClient.removeQueries({ queryKey: queryKeys.thread(threadId) })
      queryClient.removeQueries({ queryKey: queryKeys.replies(threadId) })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['pinned'] })
      void queryClient.invalidateQueries({ queryKey: ['user-threads'] })
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      queryClient.invalidateQueries({ queryKey: ['board'] })
      void queryClient.invalidateQueries({ queryKey: ['recent-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useSetThreadPinned(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pinned: boolean) =>
      request<ThreadDetail>(`/threads/${threadId}/pin`, {
        method: 'POST',
        body: { pinned },
      }),
    onError: (error) => toastMutationError(error),
    onSuccess: (thread) => {
      queryClient.setQueryData(queryKeys.thread(threadId), thread)
      patchThreadCaches(queryClient, threadId, { pinned: thread.pinned })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['pinned'] })
    },
  })
}

export function useSetThreadLocked(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (locked: boolean) =>
      request<ThreadDetail>(`/threads/${threadId}/lock`, {
        method: 'POST',
        body: { locked },
      }),
    onError: (error) => toastMutationError(error),
    onSuccess: (thread) => {
      queryClient.setQueryData(queryKeys.thread(threadId), thread)
      patchThreadCaches(queryClient, threadId, { locked: thread.locked })
    },
  })
}

// ---------------------------------------------------------------------------
// Reply mutations
// ---------------------------------------------------------------------------

export function useCreateReply(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contentHtml: string) =>
      request<Reply>(`/threads/${threadId}/replies`, {
        method: 'POST',
        body: { contentHtml },
      }),
    onError: (error) => toastMutationError(error),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.replies(threadId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.thread(threadId),
      })
      void queryClient.invalidateQueries({ queryKey: ['recent-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['user-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useUpdateReply(threadId: number, replyId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contentHtml: string) =>
      request<Reply>(`/replies/${replyId}`, {
        method: 'PATCH',
        body: { contentHtml },
      }),
    onError: (error) => toastMutationError(error),
    onSuccess: (reply) => {
      patchReplyCaches(queryClient, replyId, {
        contentHtml: reply.contentHtml,
        updatedAt: reply.updatedAt,
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.replies(threadId),
      })
      void queryClient.invalidateQueries({ queryKey: ['user-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useDeleteReply(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (replyId: number) =>
      request<void>(`/replies/${replyId}`, { method: 'DELETE' }),
    onError: (error) => toastMutationError(error),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.replies(threadId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.thread(threadId),
      })
      void queryClient.invalidateQueries({ queryKey: ['user-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['recent-replies'] })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

export function useSetReplyLike(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { replyId: number; liked: boolean }) =>
      request<LikeResult>(`/replies/${input.replyId}/like`, {
        method: input.liked ? 'PUT' : 'DELETE',
      }),
    onMutate: async (input) => {
      const reply = findReplyInCaches(queryClient, input.replyId)
      const base = input.liked
        ? {
            likedByMe: true,
            likeCount: (reply?.likeCount ?? 0) + 1,
          }
        : {
            likedByMe: false,
            likeCount: Math.max(0, (reply?.likeCount ?? 0) - 1),
          }
      patchReplyCaches(queryClient, input.replyId, base)
    },
    onSuccess: (result, input) => {
      patchReplyCaches(queryClient, input.replyId, {
        likedByMe: result.liked,
        likeCount: result.likeCount,
      })
    },
    onError: (error) => {
      toastMutationError(error)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.replies(threadId),
      })
      void queryClient.invalidateQueries({ queryKey: ['user-replies'] })
    },
  })
}

function findReplyInCaches(
  queryClient: QueryClient,
  replyId: number,
): Reply | undefined {
  for (const query of queryClient.getQueryCache().findAll()) {
    const key = query.queryKey
    if (!REPLY_LIST_KEYS.has(String(key[0]))) continue

    const data = query.state.data as InfinitePage<Reply> | undefined
    const reply = data?.pages
      ?.flatMap((page) => page.items)
      .find((item) => item.id === replyId)
    if (reply) return reply
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Likes / follows
// ---------------------------------------------------------------------------

export function useSetThreadLike(threadId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (liked: boolean) =>
      request<LikeResult>(`/threads/${threadId}/like`, {
        method: liked ? 'PUT' : 'DELETE',
      }),
    onMutate: async (liked) => {
      const thread =
        queryClient.getQueryData<ThreadDetail>(queryKeys.thread(threadId))
      const base = liked
        ? {
            likedByMe: true,
            likeCount: (thread?.likeCount ?? 0) + 1,
          }
        : {
            likedByMe: false,
            likeCount: Math.max(0, (thread?.likeCount ?? 0) - 1),
          }
      patchThreadCaches(queryClient, threadId, base)
    },
    onSuccess: (result) => {
      patchThreadCaches(queryClient, threadId, {
        likedByMe: result.liked,
        likeCount: result.likeCount,
      })
    },
    onError: (error) => {
      toastMutationError(error)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.thread(threadId),
      })
      void queryClient.invalidateQueries({ queryKey: ['threads'] })
      void queryClient.invalidateQueries({ queryKey: ['pinned'] })
    },
  })
}

export function useSetBoardFollow(slug: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (following: boolean) =>
      request<FollowResult>(`/boards/${encodeURIComponent(slug!)}/follow`, {
        method: following ? 'PUT' : 'DELETE',
      }),
    onMutate: async (following) => {
      const board = slug
        ? queryClient.getQueryData<BoardSummary>(queryKeys.board(slug))
        : undefined
      const delta = following ? 1 : -1
      const patch = {
        followingByMe: following,
        followerCount: Math.max(0, (board?.followerCount ?? 0) + delta),
      }
      patchBoardCaches(queryClient, slug, patch)
    },
    onSuccess: (result) => {
      patchBoardCaches(queryClient, slug, {
        followingByMe: result.following,
        followerCount: result.followerCount,
      })
    },
    onError: (error) => {
      toastMutationError(error)
      void queryClient.invalidateQueries({ queryKey: ['boards'] })
      if (slug) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.board(slug) })
      }
    },
  })
}

export function patchBoardCaches(
  queryClient: QueryClient,
  slug: string | undefined,
  patch: Partial<BoardSummary>,
) {
  if (!slug) return

  queryClient.setQueryData<BoardSummary>(
    queryKeys.board(slug),
    (board) => (board ? { ...board, ...patch } : board),
  )
  queryClient.setQueryData<BoardSummary[]>(queryKeys.boards, (boards) =>
    boards?.map((board) => (board.slug === slug ? { ...board, ...patch } : board)),
  )
}

export function useSetUserLike(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (liked: boolean) =>
      request<LikeResult>(`/users/${userId}/like`, {
        method: liked ? 'PUT' : 'DELETE',
      }),
    onMutate: async (liked) => {
      const delta = liked ? 1 : -1
      queryClient.setQueryData<UserProfile>(queryKeys.user(userId), (user) =>
        user
          ? {
              ...user,
              likedByMe: liked,
              profileLikeCount: Math.max(0, user.profileLikeCount + delta),
            }
          : user,
      )
    },
    onSuccess: (result) => {
      queryClient.setQueryData<UserProfile>(queryKeys.user(userId), (user) =>
        user
          ? {
              ...user,
              likedByMe: result.liked,
              profileLikeCount: result.likeCount,
            }
          : user,
      )
    },
    onError: (error) => {
      toastMutationError(error)
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(userId) })
    },
  })
}

// ---------------------------------------------------------------------------
// Profile mutations
// ---------------------------------------------------------------------------

function syncSelfProfile(queryClient: QueryClient, profile: UserProfile) {
  queryClient.setQueryData(queryKeys.user(profile.id), profile)
  queryClient.setQueryData(queryKeys.me, old => {
    if (!old || typeof old !== 'object') return old
    const me = old as { user: UserSummary | null }
    if (!me.user) return old
    return {
      ...me,
      user: {
        ...me.user,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        avatarShape: profile.avatarShape,
      },
    }
  })
  invalidateContentViews(queryClient)
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { nickname?: string | null; bio?: string }) =>
      request<UserProfile>('/me/profile', { method: 'PATCH', body: input }),
    onError: (error) => toastMutationError(error),
    onSuccess: (profile) => syncSelfProfile(queryClient, profile),
  })
}

export function useSetAvatarShape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shape: 'circle' | 'square') =>
      request<UserProfile>('/me/avatar-shape', {
        method: 'PUT',
        body: { shape },
      }),
    onSuccess: (profile) => syncSelfProfile(queryClient, profile),
  })
}

export function useBindAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uploadId: number | null) =>
      request<UserProfile>('/me/avatar', {
        method: 'PUT',
        body: { uploadId },
      }),
    onSuccess: (profile) => syncSelfProfile(queryClient, profile),
  })
}

export function useBindBackground() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (uploadId: number | null) =>
      request<UserProfile>('/me/background', {
        method: 'PUT',
        body: { uploadId },
      }),
    onSuccess: (profile) => syncSelfProfile(queryClient, profile),
  })
}