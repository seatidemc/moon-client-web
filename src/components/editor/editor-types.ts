import type { Editor } from '@tiptap/core'
import type { Ref } from 'react'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'
import type { ReplyReferenceOption } from '@/lib/reply-reference-options'

export interface RichTextEditorHandle {
  /** 在文档末尾追加楼层引用 chip 并聚焦 */
  appendReplyReference: (floor: number) => void
}

export interface RichTextEditorProps {
  /** 富文本 HTML 内容。 */
  value: string
  onChange: (value: string) => void
  /** 撑满父容器高度 */
  fillHeight?: boolean
  /** 编辑区的无障碍名称 */
  ariaLabel?: string
  /** 紧凑模式：用于快捷回复，隐藏标题和文件菜单，工具栏只保留基础格式 */
  compact?: boolean
  /**
   * 展开（高级编辑）状态。未展开时工具栏只保留基础格式，并隐藏文件
   * 导入/导出菜单。默认为展开。
   */
  advanced?: boolean
  /**
   * 是否响应外部传入的 `value` 变化。同一份状态绑定多个编辑器时，可让隐藏
   * 的那个暂不同步，等重新可见后再对齐。
   */
  syncExternalValue?: boolean
  /** 传入后，输入 re# 会提示可引用的楼层 */
  floorOptions?: ReplyReferenceOption[]
  /** 收起至单行时进入快速发送状态，由父级收起无关控件 */
  onQuickSendChange?: (quickSend: boolean) => void
  ref?: Ref<RichTextEditorHandle>
}

export interface PopupAnchor {
  left: number
  top: number
  above: boolean
}

export interface ReferenceTrigger extends PopupAnchor {
  /** re# 在文档中的起始位置 */
  from: number
  /** 光标位置，也是 re#楼层号 的结束位置 */
  to: number
  /** 已输入的楼层号前缀 */
  query: string
}

export interface EmojiSuggestionState extends PopupAnchor {
  items: EmojiSuggestionItem[]
  query: string
  command: (item: EmojiSuggestionItem) => void
}

export interface LinkPopoverState extends PopupAnchor {
  /** 链接文本在文档中的范围；from === to 表示插入新链接 */
  from: number
  to: number
  href: string
  text: string
  /** 正在编辑已有链接（否则为插入新链接） */
  editing: boolean
}

export interface TablePanelPosition {
  left: number
  top: number
}

export type OpenLinkPopover = (
  view: Editor['view'],
  from: number,
  to: number,
  href: string,
  text: string,
  editing: boolean,
) => void

export interface EditorToolbarState {
  isBold: boolean
  isItalic: boolean
  isStrike: boolean
  headingLevel: number
  isBulletList: boolean
  isOrderedList: boolean
  isBlockquote: boolean
  isCode: boolean
  isCodeBlock: boolean
  isLink: boolean
  isInTable: boolean
  canMergeCells: boolean
  canSplitCell: boolean
  canUndo: boolean
  canRedo: boolean
}