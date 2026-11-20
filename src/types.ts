/**
 * API DTO 类型，与后端 `/forum-v1` 的 JSON 契约保持一致。
 * ID 为数字，日期为 RFC3339 UTC 字符串。
 */

export type AvatarShape = 'circle' | 'square'

export type BoardIconName = 'discussion' | 'code' | 'life' | 'feedback'

/** 可空时间统一用 null 表示。 */
export type Nullable<T> = T | null

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ItemsResponse<T> {
  items: T[]
}

export interface UserSummary {
  id: number
  username: string
  nickname: Nullable<string>
  avatarUrl: string
  avatarShape: AvatarShape
}

export interface UserProfile extends UserSummary {
  bio: string
  backgroundUrl: Nullable<string>
  joinedAt: string
  threadCount: number
  replyCount: number
  likeCount: number
  profileLikeCount: number
  likedByMe: boolean
  isSelf: boolean
}

export interface BoardBrief {
  id: number
  slug: string
  name: string
  icon: string
  color: string
}

export interface BoardSummary extends BoardBrief {
  description: string
  threadCount: number
  followerCount: number
  followingByMe: boolean
}

export interface ThreadSummary {
  id: number
  board: BoardBrief
  author: Nullable<UserSummary>
  title: string
  excerpt: string
  tags: string[]
  pinned: boolean
  locked: boolean
  replyCount: number
  likeCount: number
  likedByMe: boolean
  createdAt: string
  updatedAt: string
}

export interface ThreadDetail extends ThreadSummary {
  contentHtml: string
  canEdit: boolean
  canDelete: boolean
  canModerate: boolean
}

export interface Reply {
  id: number
  threadId: number
  floor: number
  author: Nullable<UserSummary>
  contentHtml: Nullable<string>
  replyToFloor: Nullable<number>
  replyToReplyId: Nullable<number>
  likeCount: number
  likedByMe: boolean
  deleted: boolean
  createdAt: string
  updatedAt: Nullable<string>
  canEdit: boolean
  canDelete: boolean
}

export type NotificationType =
  | 'reply'
  | 'quote'
  | 'like_thread'
  | 'like_reply'
  | 'like_user'
  | 'mention'
  | 'board_thread'

export interface Notification {
  id: number
  type: NotificationType
  actor: Nullable<UserSummary>
  threadId: number
  threadTitle: string
  /** 0 表示与主题本身相关（主题提及、主题点赞、主页点赞或板块关注） */
  replyId: number
  /** quote 类型引用的楼层号；其他类型为 0 */
  quotedFloor: number
  excerpt: string
  read: boolean
  createdAt: string
}

export interface RecentReply {
  id: number
  threadId: number
  threadTitle: string
  boardSlug: string
  floor: number
  excerpt: string
  author: Nullable<UserSummary>
  createdAt: string
}

export interface TagSummary {
  name: string
  count: number
}

export interface Site {
  siteName: string
  siteDescription: string
  announcement: string
  footerText: string
  allowGuestRead: boolean
}

export interface Me {
  user: Nullable<UserSummary>
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
}

export interface LoginResult {
  user: UserSummary
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
}

export type UploadKind = 'post' | 'avatar' | 'background'

export interface UploadResult {
  id: number
  url: string
  width: number
  height: number
  mime: string
  size: number
}

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface FollowResult {
  following: boolean
  followerCount: number
}