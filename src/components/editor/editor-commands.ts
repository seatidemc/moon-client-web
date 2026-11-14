import type { Editor } from '@tiptap/core'

import type { TableActionId } from './editor-constants'
import type { ImageAlignment } from './editor-types'

export function applyHeading(editor: Editor, key: string) {
  if (key === 'paragraph') {
    editor.chain().focus().setParagraph().run()
    return
  }

  const level = Number(key)
  if (!Number.isInteger(level) || level < 1 || level > 6) return

  editor
    .chain()
    .focus()
    .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
    .run()
}

export function applyImageAlignment(
  editor: Editor,
  pos: number,
  align: ImageAlignment,
) {
  editor
    .chain()
    .setNodeSelection(pos)
    .updateAttributes('image', { align })
    .run()
}

/**
 * Applies an explicit size to an image. The resizable node view deliberately
 * ignores width/height attribute updates, so the rendered element is synced
 * directly as well; the attributes keep the size across reloads and exports.
 */
export function applyImageSize(
  editor: Editor,
  pos: number,
  width: number | null,
  height: number | null,
  attributes: Record<string, unknown> = {},
) {
  const dom = editor.view.nodeDOM(pos)
  const image =
    dom instanceof HTMLImageElement
      ? dom
      : dom instanceof HTMLElement
        ? dom.querySelector('img')
        : null

  if (image) {
    image.style.width = width === null ? '' : `${width}px`
    image.style.height = height === null ? '' : `${height}px`
  }

  editor
    .chain()
    .setNodeSelection(pos)
    .updateAttributes('image', { width, height, ...attributes })
    .run()
}

/** 切换图片是否锁定原图比例（不影响当前尺寸）。 */
export function applyImageAspectLock(
  editor: Editor,
  pos: number,
  locked: boolean,
) {
  editor
    .chain()
    .setNodeSelection(pos)
    .updateAttributes('image', { lockAspect: locked })
    .run()
}

/** 原地替换图片地址；清掉高度，让新图按自身比例渲染。 */
export function replaceImageSource(editor: Editor, pos: number, src: string) {
  editor
    .chain()
    .setNodeSelection(pos)
    .updateAttributes('image', { src, height: null })
    .run()
}

export function applyTableAction(editor: Editor, action: TableActionId) {
  const chain = editor.chain().focus()

  switch (action) {
    case 'addRowBefore':
      chain.addRowBefore().run()
      break
    case 'addRowAfter':
      chain.addRowAfter().run()
      break
    case 'deleteRow':
      chain.deleteRow().run()
      break
    case 'addColumnBefore':
      chain.addColumnBefore().run()
      break
    case 'addColumnAfter':
      chain.addColumnAfter().run()
      break
    case 'deleteColumn':
      chain.deleteColumn().run()
      break
    case 'mergeCells':
      chain.mergeCells().run()
      break
    case 'splitCell':
      chain.splitCell().run()
      break
    case 'toggleHeaderRow':
      chain.toggleHeaderRow().run()
      break
    case 'toggleHeaderColumn':
      chain.toggleHeaderColumn().run()
      break
    case 'toggleHeaderCell':
      chain.toggleHeaderCell().run()
      break
    case 'deleteTable':
      chain.deleteTable().run()
      break
  }
}