import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from '@heroui/react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { isApiError, request } from '@/lib/api'
import { DEFAULT_SITE } from '@/lib/constants'
import { useNotificationStream } from '@/lib/realtime'
import {
  ForumContext,
  type ForumContextValue,
} from '@/lib/forum-context'
import { queryKeys } from '@/lib/queries'
import type { LoginResult, Me, Site, UserSummary } from '@/types'

const EMPTY_ME: Me = {
  user: null,
  globalPermissions: [],
  boardPermissions: {},
}

const EMPTY_SITE = DEFAULT_SITE

/**
 * 全局 401 处理需要打开登录弹窗；QueryClient 在 provider 之外创建，
 * 通过模块级回调桥接当前组件的 openLogin。
 */
let globalUnauthorizedHandler: (() => void) | null = null

function handleGlobalError(error: unknown) {
  if (!isApiError(error)) return

  if (error.status === 401) {
    globalUnauthorizedHandler?.()
    return
  }

  if (error.status === 403 || error.status === 429) {
    toast.danger(error.message)
  }
}

interface AuthStateProps {
  children: ReactNode
}

function AuthState({ children }: AuthStateProps) {
  const queryClient = useQueryClient()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const pendingActionRef = useRef<(() => void) | null>(null)

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => request<Me>('/auth/me'),
    meta: { skipGlobalError: true },
    staleTime: 30_000,
  })

  const siteQuery = useQuery({
    queryKey: queryKeys.site,
    queryFn: () => request<Site>('/site'),
    meta: { skipGlobalError: true },
    staleTime: 300_000,
  })

  const openLogin = useCallback((afterLogin?: () => void) => {
    // 后台请求触发的 401 不带后续动作，不要覆盖用户刚触发的待执行动作。
    if (afterLogin) pendingActionRef.current = afterLogin
    setLoginDialogOpen(true)
  }, [])

  // 全局 401 处理需要打开登录弹窗；在 effect 中同步稳定引用。
  useEffect(() => {
    globalUnauthorizedHandler = openLogin
    return () => {
      if (globalUnauthorizedHandler === openLogin) {
        globalUnauthorizedHandler = null
      }
    }
  }, [openLogin])

  const closeLogin = useCallback(() => {
    pendingActionRef.current = null
    setLoginDialogOpen(false)
  }, [])

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      try {
        const result = await request<LoginResult>('/auth/login', {
          method: 'POST',
          body: { username, password, remember: true },
        })

        queryClient.setQueryData<Me>(queryKeys.me, {
          user: result.user,
          globalPermissions: result.globalPermissions,
          boardPermissions: result.boardPermissions,
        })
        setLoginDialogOpen(false)

        const afterLogin = pendingActionRef.current
        pendingActionRef.current = null
        afterLogin?.()

        // 登录后重新拉取带 viewer 字段的公开数据（likedByMe / followingByMe）。
        void queryClient.invalidateQueries()
        return null
      } catch (error) {
        return isApiError(error) ? error.message : '登录失败，请稍后再试。'
      }
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await request<void>('/auth/logout', { method: 'POST' })
    } catch {
      // 会话可能已经失效；本地状态仍然要清空。
    }

    pendingActionRef.current = null
    queryClient.setQueryData<Me>(queryKeys.me, EMPTY_ME)
    queryClient.removeQueries({ queryKey: ['notifications'] })
    queryClient.removeQueries({ queryKey: ['unread-count'] })
    void queryClient.invalidateQueries()
  }, [queryClient])

  const me = meQuery.data ?? EMPTY_ME
  const site = siteQuery.data ?? EMPTY_SITE
  const currentUser: UserSummary | null = me.user

  useNotificationStream(currentUser?.id)

  const hasPermission = useCallback(
    (code: string, boardId?: number | null) => {
      if (me.globalPermissions.includes(code)) return true
      if (boardId === undefined || boardId === null) return false
      return me.boardPermissions[String(boardId)]?.includes(code) ?? false
    },
    [me.boardPermissions, me.globalPermissions],
  )

  const value = useMemo<ForumContextValue>(
    () => ({
      site,
      currentUser,
      globalPermissions: me.globalPermissions,
      boardPermissions: me.boardPermissions,
      hasPermission,
      loginDialogOpen,
      openLogin,
      closeLogin,
      login,
      logout,
    }),
    [
      closeLogin,
      currentUser,
      hasPermission,
      login,
      loginDialogOpen,
      logout,
      me.boardPermissions,
      me.globalPermissions,
      openLogin,
      site,
    ],
  )

  return <ForumContext value={value}>{children}</ForumContext>
}

/**
 * 数据层入口：TanStack Query + 认证/站点上下文。
 * 业务数据不入 context，页面通过 query hooks 读取。
 */
export function ForumProvider({ children }: { children: ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.skipGlobalError) return
            handleGlobalError(error)
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (mutation.meta?.skipGlobalError) return
            handleGlobalError(error)
          },
        }),
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error) =>
              (!isApiError(error) || error.status >= 500) && failureCount < 2,
          },
          mutations: {
            retry: false,
          },
        },
      }),
    [],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthState>{children}</AuthState>
    </QueryClientProvider>
  )
}