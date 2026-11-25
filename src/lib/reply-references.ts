import type { Reply } from '@/types'

export interface ReplyReferenceOptions {
  threadId: number
  /** 当前主题已加载的回复，按 floor 升序 */
  replies: Reply[]
}