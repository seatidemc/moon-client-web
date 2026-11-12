import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'

import type { EditorToolbarState } from './editor-types'

export function useEditorToolbarState(editor: Editor): EditorToolbarState {
  return useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor.isActive('bold'),
      isItalic: currentEditor.isActive('italic'),
      isStrike: currentEditor.isActive('strike'),
      headingLevel: currentEditor.isActive('heading')
        ? (currentEditor.getAttributes('heading').level as number)
        : 0,
      isBulletList: currentEditor.isActive('bulletList'),
      isOrderedList: currentEditor.isActive('orderedList'),
      isBlockquote: currentEditor.isActive('blockquote'),
      isCode: currentEditor.isActive('code'),
      isCodeBlock: currentEditor.isActive('codeBlock'),
      isLink: currentEditor.isActive('link'),
      isInTable: currentEditor.isActive('table'),
      canMergeCells: currentEditor.can().mergeCells(),
      canSplitCell: currentEditor.can().splitCell(),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    }),
  })
}