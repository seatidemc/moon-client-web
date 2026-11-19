import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { toast } from '@heroui/react'

import { uploadImage } from '@/lib/api'

import {
  TABLE_MENU_MAX_HEIGHT,
  TABLE_MENU_WIDTH,
} from './editor-constants'
import type { OpenLinkPopover, TablePanelPosition } from './editor-types'

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

export function filterImageFiles(files: Iterable<File> | null | undefined) {
  return Array.from(files ?? []).filter((file) =>
    file.type.startsWith('image/'),
  )
}

/** 类型不符或浏览器无法解码的文件不会插入，明确提示而不是静默丢弃。 */
export function notifyUnsupportedImages(count: number) {
  if (count <= 0) return

  toast.danger(
    count === 1
      ? '不支持的图片格式。'
      : `不支持的图片格式，已跳过 ${count} 个文件。`,
  )
}

/**
 * Uploads image files first, then inserts the returned URLs at the current
 * selection. A failed upload is reported and skipped; data URLs are never
 * inserted into the document.
 */
export function insertImageFiles(view: Editor['view'], files: File[]) {
  const images = filterImageFiles(files)
  const rejected = files.length - images.length
  if (images.length === 0) {
    notifyUnsupportedImages(rejected)
    return
  }

  void Promise.allSettled(
    images.map((file) => uploadImage(file, 'post')),
  ).then((results) => {
    const uploads = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    )
    const failed = rejected + results.length - uploads.length

    if (uploads.length === 0) {
      toast.danger('图片上传失败，请稍后再试。')
      return
    }
    if (failed > 0) {
      toast.danger(`有 ${failed} 张图片上传失败，已跳过。`)
    }

    const imageType = view.state.schema.nodes.image
    if (!imageType) return

    let tr = view.state.tr
    for (const upload of uploads) {
      tr = tr.replaceSelectionWith(imageType.create({ src: upload.url }))
    }
    view.dispatch(tr.scrollIntoView())
  })
}

/** Inserts pasted clipboard images as data URLs; other pastes fall through. */
export function handleImagePaste(
  view: Editor['view'],
  event: ClipboardEvent,
) {
  const files = filterImageFiles(event.clipboardData?.files)
  if (files.length === 0) return false

  event.preventDefault()
  insertImageFiles(view, files)
  return true
}

/**
 * Inserts dropped image files as data URLs. Without intercepting these drops
 * the browser opens the file in a new tab instead. Moving nodes inside the
 * editor (`moved`) is left to ProseMirror's own drop handling.
 */
export function handleImageDrop(
  view: Editor['view'],
  event: DragEvent,
  moved: boolean,
) {
  if (moved) return false

  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length === 0) return false

  // 拦住所有文件拖放，避免浏览器直接打开文件；不支持的格式由插入流程提示。
  event.preventDefault()

  // 先把光标移到落点，异步读取文件后图片就插在这个位置。
  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
  if (coords) {
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.near(view.state.doc.resolve(coords.pos)),
      ),
    )
  }

  insertImageFiles(view, files)
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

interface ImageClickHandlers {
  openImageToolbar: (view: Editor['view'], pos: number) => void
  closeImageToolbar: () => void
}

/** Opens the image alignment toolbar when the click lands on an image. */
export function handleImageClick(
  view: Editor['view'],
  event: MouseEvent,
  { openImageToolbar, closeImageToolbar }: ImageClickHandlers,
) {
  const target = event.target as HTMLElement | null
  const image = target?.closest('img')

  if (!image || !view.dom.contains(image)) {
    closeImageToolbar()
    return
  }

  openImageToolbar(view, view.posAtDOM(image, 0))
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