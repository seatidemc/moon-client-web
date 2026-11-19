import type { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import { useMentionCandidates } from '@/lib/queries'
import { replyReferenceSpacing } from '@/lib/tiptap-reply-references'
import type { UserSummary } from '@/types'

import { MENTION_POPUP_HEIGHT, MENTION_POPUP_WIDTH } from './editor-constants'
import type { MentionTrigger } from './editor-types'
import {
  MENTION_QUERY_PATTERN,
  anchorPopup,
  isCaretInsidePanel,
} from './editor-utils'

interface Options {
  panelRef: RefObject<HTMLDivElement | null>
  /** 允许浮窗超出编辑器上边缘（用于底部快捷回复） */
  allowOutsidePanel?: boolean
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [delay, value])

  return debounced
}

/**
 * Tracks an `@` query typed in the editor and searches users through the API.
 * Candidates are always the server's `UserSummary` shape, and the inserted
 * chip only stores the user id plus the immutable username.
 */
export function useMentionSuggestion({
  panelRef,
  allowOutsidePanel = false,
}: Options) {
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const debouncedQuery = useDebouncedValue(trigger?.query ?? '', 150)
  const candidates = useMentionCandidates(debouncedQuery)

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
      const match = MENTION_QUERY_PATTERN.exec(textBefore)

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
          MENTION_POPUP_WIDTH,
          MENTION_POPUP_HEIGHT,
          allowOutsidePanel,
        ),
      })
      setActiveIndex(0)
    },
    [allowOutsidePanel, panelRef],
  )

  const options = useMemo<UserSummary[]>(() => {
    if (!trigger || trigger.query.trim() === '') return []
    return candidates.data ?? []
  }, [candidates.data, trigger])

  const boundedIndex = Math.min(
    activeIndex,
    Math.max(options.length - 1, 0),
  )
  const visible = trigger !== null

  const hide = useCallback(() => setTrigger(null), [])

  const choose = useCallback(
    (currentEditor: Editor, user: UserSummary) => {
      if (!trigger) return

      const { state, view } = currentEditor
      const chipType = state.schema.nodes.mention
      if (!chipType) return

      const chip = chipType.create({
        userId: user.id,
        username: user.username,
      })
      // Keep typing after the chip separated from it, the same way a picked
      // floor is.
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
    loading: candidates.isFetching,
    update,
    hide,
    choose,
    handleKeyDown,
    setActiveIndex,
  }
}