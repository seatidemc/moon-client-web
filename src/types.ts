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

export interface ForumData {
  users: User[]
  boards: Board[]
  threads: ForumThread[]
  replies: Reply[]
}
