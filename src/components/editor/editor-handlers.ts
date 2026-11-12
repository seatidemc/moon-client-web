import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'

import {
  TABLE_MENU_MAX_HEIGHT,
  TABLE_MENU_WIDTH,
} from './editor-constants'
import type { OpenLinkPopover, TablePanelPosition } from './editor-types'
import { readImageFileAsDataUrl } from './editor-utils'

/** 单行模式只保留一行文字，粘贴内容里的换行与连续空白压成空格。 */
export function handleSingleLinePaste(
  view: Editor['view'],
  event: ClipboardEvent,
) {
  event.preventDefault()

  const text = (event.clipboardData?.getData('text/plain') ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text === '') return true

  // 先删掉选区再按光标插入；全选时直接跨块替换会让粘贴规则的区间错位。
  const tr = view.state.tr.deleteSelection()
  view.dispatch(
    tr
      .insertText(text, tr.selection.from)
      // 标记为粘贴，让链接粘贴规则照常识别文本里的网址。
      .setMeta('uiEvent', 'paste')
      .scrollIntoView(),
  )
  return true
}

/** Inserts pasted clipboard images as data URLs; other pastes fall through. */
export function handleImagePaste(
  view: Editor['view'],
  event: ClipboardEvent,
) {
  const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  )
  if (files.length === 0) return false

  event.preventDefault()

  // 暂时只把图片作为 data URL 插入文档，不做上传。
  void Promise.all(files.map(readImageFileAsDataUrl))
    .then((sources) => {
      const imageType = view.state.schema.nodes.image
      if (!imageType) return

      let tr = view.state.tr
      for (const src of sources) {
        tr = tr.replaceSelectionWith(imageType.create({ src }))
      }
      view.dispatch(tr.scrollIntoView())
    })
    .catch(() => {
      // 无法读取的剪贴板图片直接忽略。
    })

  return true
}

interface LinkClickHandlers {
  openLinkPopover: OpenLinkPopover
  closeLinkPopover: () => void
}

export function handleLinkClick(
  view: Editor['view'],
  event: MouseEvent,
  { openLinkPopover, closeLinkPopover }: LinkClickHandlers,
) {
  const target = event.target as HTMLElement | null
  const anchor = target?.closest('a')

  if (!anchor || !view.dom.contains(anchor)) {
    closeLinkPopover()
    return false
  }

  const href = anchor.getAttribute('href') ?? ''

  // Ctrl/Cmd+单击直接打开链接，普通单击打开编辑浮窗。
  if (event.metaKey || event.ctrlKey) {
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
    return true
  }

  const from = view.posAtDOM(anchor, 0)
  const to = view.posAtDOM(anchor, anchor.childNodes.length)
  openLinkPopover(view, from, to, href, anchor.textContent ?? '', true)
  return false
}

interface CellMenuHandlers {
  openTableMenu: (position: TablePanelPosition) => void
  closeTablePicker: () => void
  closeLinkPopover: () => void
}

export function handleCellContextMenu(
  view: Editor['view'],
  event: MouseEvent,
  { openTableMenu, closeTablePicker, closeLinkPopover }: CellMenuHandlers,
) {
  const target = event.target as HTMLElement | null
  const cell = target?.closest('td, th')

  if (!cell || !view.dom.contains(cell)) return false

  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  })
  if (!coords) return false

  event.preventDefault()

  // 右键先把光标定位到目标单元格，菜单里的行列操作才作用于该处。
  // 若右键落在已框选的单元格内，则保留选区，方便合并单元格。
  const cellPos = view.posAtDOM(cell, 0)
  const currentSelection = view.state.selection
  const keepCellSelection =
    currentSelection instanceof CellSelection &&
    currentSelection.ranges.some(
      (range) => cellPos >= range.$from.pos && cellPos <= range.$to.pos,
    )

  if (!keepCellSelection) {
    const selection = TextSelection.near(view.state.doc.resolve(coords.pos))
    view.dispatch(view.state.tr.setSelection(selection))
  }

  const maxLeft = Math.max(8, window.innerWidth - TABLE_MENU_WIDTH - 8)
  const maxHeight = Math.min(TABLE_MENU_MAX_HEIGHT, window.innerHeight - 16)
  const maxTop = Math.max(8, window.innerHeight - maxHeight - 8)

  closeTablePicker()
  closeLinkPopover()
  openTableMenu({
    left: Math.min(Math.max(event.clientX, 8), maxLeft),
    top: Math.min(Math.max(event.clientY, 8), maxTop),
  })

  return true
}