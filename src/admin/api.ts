import { buildQuery, request } from '@/lib/api'

import type {
  AdminBoard,
  AdminLoginResult,
  AdminMe,
  AdminReply,
  AdminThread,
  AdminUpload,
  AdminUser,
  AuditLog,
  BatchResult,
  Dashboard,
  Grant,
  ItemsResponse,
  LoginRecordItem,
  Page,
  PermissionItem,
  SiteSettings,
  UploadStatsSummary,
} from './types'

/**
 * 管理后台 API 前缀。`request` 已经带 `/forum-v1`，这里只补 `/admin`。
 * 后台使用后端独立的 `forum_admin_session` cookie，与论坛前台登录态互不影响。
 */
export const ADMIN_API_BASE = '/admin'

export function adminRequest<T>(
  path: string,
  options?: Parameters<typeof request>[1],
): Promise<T> {
  return request<T>(`${ADMIN_API_BASE}${path}`, options)
}

export interface BoardInput {
  slug?: string
  name?: string
  description?: string
  icon?: string
  color?: string
  sortOrder?: number
  enabled?: boolean
}

export interface ThreadQuery {
  boardId?: number
  authorId?: number
  status?: string
  pinned?: boolean
  locked?: boolean
  keyword?: string
  sort?: string
  page?: number
  pageSize?: number
}

export interface ReplyQuery {
  threadId?: number
  authorId?: number
  status?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export interface UserQuery {
  keyword?: string
  banned?: boolean
  permission?: string[]
  page?: number
  pageSize?: number
}

export interface AuditQuery {
  actorId?: number
  action?: string
  targetType?: string
  targetId?: number
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const adminApi = {
  me: () => adminRequest<AdminMe>('/auth/me'),

  login: (username: string, password: string) =>
    adminRequest<AdminLoginResult>('/auth/login', {
      method: 'POST',
      body: { username, password, remember: true },
    }),

  logout: () => adminRequest<void>('/auth/logout', { method: 'POST' }),

  dashboard: (days: number) =>
    adminRequest<Dashboard>(`/dashboard${buildQuery({ days })}`),

  auditLogs: (query: AuditQuery) =>
    adminRequest<Page<AuditLog>>(`/audit-logs${buildQuery(query)}`),

  boards: (options?: {
    includeDisabled?: boolean
    includeDeleted?: boolean
    page?: number
    pageSize?: number
  }) =>
    adminRequest<Page<AdminBoard>>(`/boards${buildQuery(options ?? {})}`),

  createBoard: (input: BoardInput) =>
    adminRequest<AdminBoard>('/boards', { method: 'POST', body: input }),

  updateBoard: (id: number, input: BoardInput) =>
    adminRequest<AdminBoard>(`/boards/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  deleteBoard: (id: number) =>
    adminRequest<void>(`/boards/${id}`, { method: 'DELETE' }),

  restoreBoard: (id: number) =>
    adminRequest<AdminBoard>(`/boards/${id}/restore`, { method: 'POST' }),

  reorderBoards: (ids: number[]) =>
    adminRequest<void>('/boards/reorder', { method: 'POST', body: { ids } }),

  threads: (query: ThreadQuery) =>
    adminRequest<Page<AdminThread>>(`/threads${buildQuery(query)}`),

  thread: (id: number) => adminRequest<AdminThread>(`/threads/${id}`),

  updateThread: (
    id: number,
    input: { pinned?: boolean; locked?: boolean; boardId?: number },
  ) =>
    adminRequest<AdminThread>(`/threads/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  deleteThread: (id: number, reason?: string) =>
    adminRequest<void>(`/threads/${id}${buildQuery({ reason })}`, {
      method: 'DELETE',
    }),

  restoreThread: (id: number) =>
    adminRequest<AdminThread>(`/threads/${id}/restore`, { method: 'POST' }),

  batchThreads: (input: {
    ids: number[]
    action: string
    boardId?: number
    reason?: string
  }) =>
    adminRequest<BatchResult>('/threads/batch', {
      method: 'POST',
      body: input,
    }),

  replies: (query: ReplyQuery) =>
    adminRequest<Page<AdminReply>>(`/replies${buildQuery(query)}`),

  reply: (id: number) => adminRequest<AdminReply>(`/replies/${id}`),

  updateReply: (id: number, contentHtml: string) =>
    adminRequest<AdminReply>(`/replies/${id}`, {
      method: 'PATCH',
      body: { contentHtml },
    }),

  deleteReply: (id: number, reason?: string) =>
    adminRequest<void>(`/replies/${id}${buildQuery({ reason })}`, {
      method: 'DELETE',
    }),

  restoreReply: (id: number) =>
    adminRequest<AdminReply>(`/replies/${id}/restore`, { method: 'POST' }),

  batchReplies: (input: { ids: number[]; action: string; reason?: string }) =>
    adminRequest<BatchResult>('/replies/batch', {
      method: 'POST',
      body: input,
    }),

  users: (query: UserQuery) =>
    adminRequest<Page<AdminUser>>(`/users${buildQuery(query)}`),

  user: (id: number) => adminRequest<AdminUser>(`/users/${id}`),

  updateUserProfile: (
    id: number,
    input: { nickname?: string | null; bio?: string },
  ) =>
    adminRequest<AdminUser>(`/users/${id}/profile`, {
      method: 'PATCH',
      body: input,
    }),

  setUserBanned: (id: number, banned: boolean) =>
    adminRequest<AdminUser>(`/users/${id}/${banned ? 'ban' : 'unban'}`, {
      method: 'POST',
    }),

  userPermissions: (id: number) =>
    adminRequest<ItemsResponse<Grant>>(`/users/${id}/permissions`),

  replaceUserPermissions: (id: number, grants: Grant[]) =>
    adminRequest<ItemsResponse<Grant>>(`/users/${id}/permissions`, {
      method: 'PUT',
      body: { grants },
    }),

  loginRecords: (id: number, page: number, pageSize = 20) =>
    adminRequest<Page<LoginRecordItem>>(
      `/users/${id}/login-records${buildQuery({ page, pageSize })}`,
    ),

  permissionCatalog: () =>
    adminRequest<ItemsResponse<PermissionItem>>('/permissions'),

  settings: () => adminRequest<SiteSettings>('/settings'),

  updateSettings: (updates: Record<string, string>) =>
    adminRequest<SiteSettings>('/settings', {
      method: 'PUT',
      body: updates,
    }),

  uploads: (query: {
    kind?: string
    ownerId?: number
    page?: number
    pageSize?: number
  }) => adminRequest<Page<AdminUpload>>(`/uploads${buildQuery(query)}`),

  uploadStats: () => adminRequest<UploadStatsSummary>('/uploads/stats'),

  deleteUpload: (id: number) =>
    adminRequest<void>(`/uploads/${id}`, { method: 'DELETE' }),
}