export interface User {
  id: string
  name: string
  handle: string
  bio: string
  joinedAt: string
}

export interface Board {
  id: string
  name: string
  description: string
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
