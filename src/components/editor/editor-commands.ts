import type { Editor } from '@tiptap/core'

import type { TableActionId } from './editor-constants'

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