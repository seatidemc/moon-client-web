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
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { isApiError } from '@/lib/api'

import { adminApi } from './api'
import type { AdminMe } from './types'

export const adminKeys = {
  me: ['admin', 'me'] as const,
  dashboard: (days: number) => ['admin', 'dashboard', days] as const,
  boards: (query?: unknown) => ['admin', 'boards', query] as const,
  threads: (query: unknown) => ['admin', 'threads', query] as const,
  thread: (id: number) => ['admin', 'thread', id] as const,
  replies: (query: unknown) => ['admin', 'replies', query] as const,
  reply: (id: number) => ['admin', 'reply', id] as const,
  users: (query: unknown) => ['admin', 'users', query] as const,
  user: (id: number) => ['admin', 'user', id] as const,
  userPermissions: (id: number) => ['admin', 'user-permissions', id] as const,
  loginRecords: (id: number, page: number) =>
    ['admin', 'login-records', id, page] as const,
  permissionCatalog: ['admin', 'permission-catalog'] as const,
  permissionUsers: (code: string, boardId: number | null, page: number) =>
    ['admin', 'permission-users', code, boardId, page] as const,
  settings: ['admin', 'settings'] as const,
  uploads: (query: unknown) => ['admin', 'uploads', query] as const,
  uploadStats: ['admin', 'upload-stats'] as const,
  auditLogs: (query: unknown) => ['admin', 'audit-logs', query] as const,
}

const EMPTY_ME: AdminMe = {
  user: null,
  isSuperuser: false,
  globalPermissions: [],
  boardPermissions: {},
}

export type AdminStatus = 'loading' | 'anonymous' | 'forbidden' | 'error' | 'ready'

export interface AdminContextValue {
  status: AdminStatus
  errorMessage: string
  me: AdminMe
  isSuperuser: boolean
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
  /** 全局权限或指定板块权限。 */
  can: (code: string, boardId?: number | null) => boolean
  /** 仅全局权限（对应后端 `RequirePermission`）。 */
  canGlobal: (code: string) => boolean
  /** 全局授权或任一板块授权。 */
  hasAnyScope: (code: string) => boolean
  login: (username: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  retry: () => void
}

const AdminContext = createContext<AdminContextValue | null>(null)

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider')
  }
  return context
}

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

function AdminAuthState({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [sessionVersion, setSessionVersion] = useState(0)

  const meQuery = useQuery({
    queryKey: adminKeys.me,
    queryFn: adminApi.me,
    meta: { skipGlobalError: true },
    staleTime: 30_000,
    retry: false,
  })

  const expireSession = useCallback(() => {
    setSessionVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    globalUnauthorizedHandler = expireSession
    return () => {
      if (globalUnauthorizedHandler === expireSession) {
        globalUnauthorizedHandler = null
      }
    }
  }, [expireSession])

  // 任意业务请求返回 401 时刷新登录态；me 查询本身跳过全局处理。
  useEffect(() => {
    if (sessionVersion === 0) return
    void queryClient.invalidateQueries({ queryKey: adminKeys.me })
  }, [queryClient, sessionVersion])

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      try {
        await adminApi.login(username, password)
        const me = await adminApi.me()
        queryClient.setQueryData(adminKeys.me, me)
        queryClient.removeQueries({
          predicate: (query) =>
            query.queryKey[0] === 'admin' && query.queryKey[1] !== 'me',
        })
        setSessionVersion((version) => version + 1)
        return null
      } catch (error) {
        return isApiError(error) ? error.message : '登录失败，请稍后再试。'
      }
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    try {
      await adminApi.logout()
    } catch {
      // 会话可能已经失效；本地状态仍然要清空。
    }

    queryClient.setQueryData<AdminMe>(adminKeys.me, EMPTY_ME)
    queryClient.removeQueries({
      predicate: (query) =>
        query.queryKey[0] === 'admin' && query.queryKey[1] !== 'me',
    })
  }, [queryClient])

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.me })
  }, [queryClient])

  const me = meQuery.data ?? EMPTY_ME
  const isSuperuser = me.isSuperuser

  const can = useCallback(
    (code: string, boardId?: number | null) => {
      if (isSuperuser) return true
      if (me.globalPermissions.includes(code)) return true
      if (boardId === undefined || boardId === null) return false
      return me.boardPermissions[String(boardId)]?.includes(code) ?? false
    },
    [isSuperuser, me.boardPermissions, me.globalPermissions],
  )

  const canGlobal = useCallback(
    (code: string) => isSuperuser || me.globalPermissions.includes(code),
    [isSuperuser, me.globalPermissions],
  )

  const hasAnyScope = useCallback(
    (code: string) =>
      isSuperuser ||
      me.globalPermissions.includes(code) ||
      Object.values(me.boardPermissions).some((codes) => codes.includes(code)),
    [isSuperuser, me.boardPermissions, me.globalPermissions],
  )

  let status: AdminStatus = 'ready'
  let errorMessage = ''

  if (meQuery.isError) {
    const error = meQuery.error
    const statusCode = isApiError(error) ? error.status : 0
    if (statusCode === 401) {
      status = 'anonymous'
    } else if (statusCode === 403) {
      status = 'forbidden'
      errorMessage = error instanceof Error ? error.message : '无管理权限'
    } else {
      status = 'error'
      errorMessage =
        error instanceof Error ? error.message : '无法连接管理接口。'
    }
  } else if (!me.user) {
    status = 'anonymous'
  }

  const value = useMemo<AdminContextValue>(
    () => ({
      status,
      errorMessage,
      me,
      isSuperuser,
      globalPermissions: me.globalPermissions,
      boardPermissions: me.boardPermissions,
      can,
      canGlobal,
      hasAnyScope,
      login,
      logout,
      retry,
    }),
    [
      can,
      canGlobal,
      errorMessage,
      hasAnyScope,
      isSuperuser,
      login,
      logout,
      me,
      retry,
      status,
    ],
  )

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted">
        正在读取登录状态…
      </div>
    )
  }

  return <AdminContext value={value}>{children}</AdminContext>
}

export function AdminProvider({ children }: { children: ReactNode }) {
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
      <AdminAuthState>{children}</AdminAuthState>
    </QueryClientProvider>
  )
}