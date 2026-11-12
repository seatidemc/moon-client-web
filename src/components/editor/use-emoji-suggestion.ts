import type { Editor } from '@tiptap/core'
import {
  exitSuggestion,
  type SuggestionProps,
} from '@tiptap/suggestion'
import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'
import { EmojiSuggestionPluginKey } from '@/lib/tiptap-emoji-shortcodes'

import { EMOJI_POPUP_HEIGHT, EMOJI_POPUP_WIDTH } from './editor-constants'
import type { EmojiSuggestionState } from './editor-types'
import { anchorPopup, isCaretInsidePanel } from './editor-utils'

type SuggestionState = SuggestionProps<
  EmojiSuggestionItem,
  EmojiSuggestionItem
>

/** Bridges Tiptap's emoji suggestion plugin to a React picker. */
export function useEmojiSuggestion({
  panelRef,
  allowOutsidePanel = false,
}: {
  panelRef: RefObject<HTMLDivElement | null>
  /** 允许浮窗超出编辑器上边缘（用于底部快捷回复） */
  allowOutsidePanel?: boolean
}) {
  const [suggestion, setSuggestion] = useState<EmojiSuggestionState | null>(
    null,
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const propsRef = useRef<SuggestionState | null>(null)

  const update = useCallback(
    (props: SuggestionState, resetIndex = true) => {
      propsRef.current = props

      const panel = panelRef.current

      // No matches: the picker stays hidden until the query matches again.
      if (!panel || props.items.length === 0) {
        setSuggestion(null)
        return
      }

      const coords = props.editor.view.coordsAtPos(props.range.to)
      const panelRect = panel.getBoundingClientRect()

      // Close the picker if the caret has scrolled out of the editor.
      if (!isCaretInsidePanel(coords, panelRect)) {
        setSuggestion(null)
        return
      }

      setSuggestion({
        items: props.items,
        query: props.query,
        command: props.command,
        ...anchorPopup(
          coords,
          panelRect,
          EMOJI_POPUP_WIDTH,
          EMOJI_POPUP_HEIGHT,
          allowOutsidePanel,
        ),
      })

      if (resetIndex) setActiveIndex(0)
    },
    [allowOutsidePanel, panelRef],
  )

  const hide = useCallback(() => {
    propsRef.current = null
    setSuggestion(null)
  }, [])

  const close = useCallback(
    (currentEditor: Editor) => {
      exitSuggestion(currentEditor.view, EmojiSuggestionPluginKey)
      hide()
    },
    [hide],
  )

  const choose = useCallback(
    (item: EmojiSuggestionItem) => {
      if (!suggestion) return

      suggestion.command(item)
      hide()
    },
    [hide, suggestion],
  )

  /** Re-anchor after the editor scrolls without changing the query. */
  const refreshPosition = useCallback(() => {
    const props = propsRef.current
    if (props) update(props, false)
  }, [update])

  const boundedIndex = Math.min(
    activeIndex,
    Math.max((suggestion?.items.length ?? 0) - 1, 0),
  )
  const visible = suggestion !== null && suggestion.items.length > 0

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, currentEditor: Editor | null) => {
      if (!visible || !suggestion) return false

      const { items } = suggestion

      if (event.key === 'ArrowDown') {
        setActiveIndex((index) => (index + 1) % items.length)
      } else if (event.key === 'ArrowUp') {
        setActiveIndex((index) => (index - 1 + items.length) % items.length)
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        choose(items[boundedIndex])
      } else if (event.key === 'Escape') {
        if (!currentEditor) return false
        close(currentEditor)
      } else {
        // Let every other key reach the editor and refine the query.
        return false
      }

      event.preventDefault()
      event.stopPropagation()
      return true
    },
    [boundedIndex, choose, close, suggestion, visible],
  )

  return {
    suggestion,
    visible,
    activeIndex: boundedIndex,
    update,
    hide,
    close,
    choose,
    refreshPosition,
    handleKeyDown,
    setActiveIndex,
  }
}