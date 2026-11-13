import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import type { ReplyReferenceOption } from '@/lib/reply-reference-options'
import { replyReferenceSpacing } from '@/lib/tiptap-reply-references'

import { POPUP_HEIGHT, POPUP_WIDTH } from './editor-constants'
import type { ReferenceTrigger } from './editor-types'
import {
  REFERENCE_QUERY_PATTERN,
  anchorPopup,
  isCaretInsidePanel,
} from './editor-utils'

interface Options {
  panelRef: RefObject<HTMLDivElement | null>
  floorOptions: ReplyReferenceOption[]
  /** 允许浮窗超出编辑器上边缘（用于底部快捷回复） */
  allowOutsidePanel?: boolean
}

/** Tracks a `re#` query typed in the editor and exposes the floor picker. */
export function useReferenceSuggestion({
  panelRef,
  floorOptions,
  allowOutsidePanel = false,
}: Options) {
  const [trigger, setTrigger] = useState<ReferenceTrigger | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const update = useCallback(
    (currentEditor: Editor) => {
      const { selection } = currentEditor.state
      const panel = panelRef.current

      if (
        !panel ||
        !selection.empty ||
        !selection.$from.parent.isTextblock ||
        currentEditor.isActive('code') ||
        currentEditor.isActive('codeBlock')
      ) {
        setTrigger(null)
        return
      }

      const textBefore = selection.$from.parent.textBetween(
        0,
        selection.$from.parentOffset,
      )
      const match = REFERENCE_QUERY_PATTERN.exec(textBefore)

      if (!match) {
        setTrigger(null)
        return
      }

      const coords = currentEditor.view.coordsAtPos(selection.from)
      const panelRect = panel.getBoundingClientRect()

      // Close the picker if the caret has scrolled out of the editor.
      if (!isCaretInsidePanel(coords, panelRect)) {
        setTrigger(null)
        return
      }

      setTrigger({
        from: selection.from - match[1].length,
        to: selection.from,
        query: match[2],
        ...anchorPopup(
          coords,
          panelRect,
          POPUP_WIDTH,
          POPUP_HEIGHT,
          allowOutsidePanel,
        ),
      })
      setActiveIndex(0)
    },
    [allowOutsidePanel, panelRef],
  )

  const options = useMemo(
    () =>
      trigger
        ? floorOptions.filter((option) =>
            String(option.floor).startsWith(trigger.query),
          )
        : [],
    [floorOptions, trigger],
  )
  const boundedIndex = Math.min(
    activeIndex,
    Math.max(options.length - 1, 0),
  )
  const visible = trigger !== null && floorOptions.length > 0

  const hide = useCallback(() => setTrigger(null), [])

  const choose = useCallback(
    (currentEditor: Editor, option: ReplyReferenceOption) => {
      if (!trigger) return

      const { state, view } = currentEditor
      const chipType = state.schema.nodes.replyReference
      if (!chipType) return

      const chip = chipType.create({ floor: option.floor })
      // Keep typing after the chip separated from it, the same way a picked
      // floor in the reply composer is.
      const { $from } = state.selection
      const after = $from.parent.textBetween(
        $from.parentOffset,
        $from.parent.content.size,
      )
      const { trailing } = replyReferenceSpacing('', after)
      const transaction = state.tr.replaceWith(trigger.from, trigger.to, [
        chip,
        ...(trailing ? [state.schema.text(trailing)] : []),
      ])

      transaction.setSelection(
        TextSelection.create(
          transaction.doc,
          trigger.from + chip.nodeSize + trailing.length,
        ),
      )

      view.dispatch(transaction)
      view.focus()
      setTrigger(null)
    },
    [trigger],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, currentEditor: Editor | null) => {
      if (!trigger || options.length === 0) return false

      if (event.key === 'ArrowDown') {
        setActiveIndex((index) => (index + 1) % options.length)
      } else if (event.key === 'ArrowUp') {
        setActiveIndex(
          (index) => (index - 1 + options.length) % options.length,
        )
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        if (!currentEditor) return false
        choose(currentEditor, options[boundedIndex])
      } else if (event.key === 'Escape') {
        setTrigger(null)
      } else {
        // Let every other key reach the editor and refine the query.
        return false
      }

      event.preventDefault()
      event.stopPropagation()
      return true
    },
    [boundedIndex, choose, options, trigger],
  )

  return {
    trigger,
    options,
    activeIndex: boundedIndex,
    visible,
    update,
    hide,
    choose,
    handleKeyDown,
    setActiveIndex,
  }
}