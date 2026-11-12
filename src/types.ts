export interface User {
  id: string
  name: string
  handle: string
  bio: string
  joinedAt: string
  /** 自定义头像图片地址；为空时使用按 handle 生成的默认头像 */
  avatarUrl?: string
}

export type BoardIconName = 'discussion' | 'code' | 'life' | 'feedback'

export interface Board {
  id: string
  name: string
  description: string
  /** 板块图标标识，映射到 pixelarticons 图标，见 src/lib/board-icons.ts */
  icon: BoardIconName
  /** 板块主题色（hex），用于图标底色和卡片强调 */
  color: string
}

export interface ForumThread {
  id: string
  boardId: string
  authorId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
}

export interface Reply {
  id: string
  threadId: string
  authorId: string
  content: string
  createdAt: string
}

export interface PinnedAnnouncement {
  id: string
  title: string
  content: string
  publisherId: string
  publishedAt: string
}

export interface ForumData {
  users: User[]
  boards: Board[]
  threads: ForumThread[]
  replies: Reply[]
  /** 用户主页的点赞记录：被点赞用户 id → 点赞者 id 列表 */
  userLikes: Record<string, string[]>
  /** 用户主页背景图：用户 id → 图片 data URL */
  userBackgrounds: Record<string, string>
}
