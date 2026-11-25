/**
 * 管理后台 API DTO 类型，与后端 `/forum-v1/admin` 的 JSON 契约保持一致。
 * 与论坛前台共用 `UserSummary` / `Page` 等基础类型。
 */
import type { AvatarShape, Page, UserSummary } from '@/types'

export type { Page, UserSummary }

export interface AdminMe {
  user: UserSummary | null
  isSuperuser: boolean
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
}

export interface AdminLoginResult {
  user: UserSummary
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
}

export interface Grant {
  permissionCode: string
  boardId: number | null
}

export type PermissionScope = 'global' | 'board' | 'self'

export interface PermissionItem {
  code: string
  group: string
  scope: PermissionScope
  description: string
  default: boolean
}

export interface AdminUser {
  id: number
  username: string
  nickname: string | null
  bio: string
  avatarUrl: string
  avatarShape: AvatarShape
  banned: boolean
  labRole: string
  createdAt: string
  lastForumLoginAt: string | null
  lastAdminLoginAt: string | null
  threadCount: number
  replyCount: number
  likeCount: number
  permissions: Grant[]
}

export interface AdminBoard {
  id: number
  slug: string
  name: string
  description: string
  icon: string
  color: string
  sortOrder: number
  enabled: boolean
  deleted: boolean
  threadCount: number
}

export interface BoardBrief {
  id: number
  slug: string
  name: string
  icon: string
  color: string
}

export interface AdminThread {
  id: number
  boardId: number
  board: BoardBrief
  author: UserSummary | null
  title: string
  contentHtml?: string
  excerpt: string
  pinned: boolean
  locked: boolean
  deleted: boolean
  deletedAt: string | null
  deletedBy: number | null
  replyCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  lastReplyAt: string | null
}

export interface AdminReply {
  id: number
  threadId: number
  threadTitle: string
  floor: number
  author: UserSummary | null
  contentHtml?: string
  excerpt: string
  deleted: boolean
  deletedAt: string | null
  deletedBy: number | null
  likeCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminUpload {
  id: number
  ownerId: number
  ownerName: string
  kind: string
  key: string
  url: string
  originalName: string
  mime: string
  sizeBytes: number
  width: number
  height: number
  sha256: string
  createdAt: string
}

export interface UploadStats {
  kind: string
  count: number
  sizeBytes: number
}

export interface UploadStatsSummary {
  items: UploadStats[]
  quotaBytes: number
  userQuotaBytes: number
}

export interface DashboardTotals {
  threads: number
  replies: number
  users: number
  boards: number
}

export interface DashboardTrend {
  date: string
  threads: number
  replies: number
  users: number
}

export interface Dashboard {
  totals: DashboardTotals
  today: DashboardTotals
  trend: DashboardTrend[]
}

export interface SiteSettings {
  siteName: string
  siteDescription: string
  announcement: string
  footerText: string
  allowGuestRead: boolean
  defaultAvatarUrlTemplate: string
  raw: Record<string, string>
}

export interface AuditLog {
  id: number
  actorId: number
  action: string
  targetType: string
  targetId: number
  detail: unknown
  ip: string
  userAgent: string
  createdAt: string
}

export interface LoginRecordItem {
  id: number
  channel: string
  ip: string
  userAgent: string
  createdAt: string
}

export interface BatchFailure {
  id: number
  reason: string
}

export interface BatchResult {
  succeeded: number[]
  failed: BatchFailure[]
}

export interface ItemsResponse<T> {
  items: T[]
}