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
  /** 最后编辑时间；从未编辑过时为空 */
  updatedAt?: string
  /** 是否为置顶主题；置顶主题出现在首页或所在板块顶部 */
  pinned?: boolean
}

export interface Reply {
  id: string
  threadId: string
  authorId: string
  content: string
  /** 该跟帖回复的楼层号（0 表示主题帖）；未引用楼层时为空 */
  replyToFloor?: number
  createdAt: string
}

export interface ForumData {
  users: User[]
  boards: Board[]
  threads: ForumThread[]
  replies: Reply[]
  /** 用户主页的点赞记录：被点赞用户 id → 点赞者 id 列表 */
  userLikes: Record<string, string[]>
  /** 楼层点赞记录：帖子键（thread:<id> / reply:<id>）→ 点赞者 id 列表 */
  postLikes: Record<string, string[]>
  /** 板块关注记录：板块 id → 关注者 id 列表 */
  boardFollows: Record<string, string[]>
  /** 用户主页背景图：用户 id → 图片 data URL */
  userBackgrounds: Record<string, string>
}
