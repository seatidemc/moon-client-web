import { getMarkRange } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { cn } from '@heroui/react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import { expandEmojiShortcodes } from '@/lib/tiptap-emoji-shortcodes'
import { setReplyReferenceFloors } from '@/lib/tiptap-reply-references'

import { EditorToolbar } from './EditorToolbar'
import { EmojiPicker } from './EmojiPicker'
import { LinkPopover } from './LinkPopover'
import { MarkdownFileMenu } from './MarkdownFileMenu'
import { ReferencePicker } from './ReferencePicker'
import { TableMenu } from './TableMenu'
import { TablePicker } from './TablePicker'
import {
  LINK_POPUP_HEIGHT,
  LINK_POPUP_WIDTH,
  TABLE_PICKER_WIDTH,
} from './editor-constants'
import { createEditorExtensions } from './editor-extensions'
import {
  handleCellContextMenu,
  handleImagePaste,
  handleLinkClick,
} from './editor-handlers'
import type {
  LinkPopoverState,
  OpenLinkPopover,
  RichTextEditorProps,
  TablePanelPosition,
} from './editor-types'
import {
  anchorPopup,
  downloadMarkdown,
  isCaretInsidePanel,
  normalizeMarkdown,
} from './editor-utils'
import { useDismissOnOutside } from './use-dismiss-on-outside'
import { useEditorToolbarState } from './use-editor-state'
import { useEmojiSuggestion } from './use-emoji-suggestion'
import { useReferenceSuggestion } from './use-reference-suggestion'

export function RichTextEditor({
  value,
  onChange,
  fillHeight = false,
  ariaLabel = '正文',
  compact = false,
  syncExternalValue = true,
  floorOptions = [],
  ref,
}: RichTextEditorProps) {
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState | null>(null)
  const [tablePicker, setTablePicker] = useState<TablePanelPosition | null>(
    null,
  )
  const [tableMenu, setTableMenu] = useState<TablePanelPosition | null>(null)

  const onChangeRef = useRef(onChange)
  // Tracks what this editor emitted so external resets can be told apart from
  // the parent echoing our own changes back through `value`.
  const lastEmittedMarkdownRef = useRef(value)
  const richPanelRef = useRef<HTMLDivElement>(null)
  const referencePanelRef = useRef<HTMLDivElement>(null)
  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const linkPanelRef = useRef<HTMLDivElement>(null)
  const tableButtonRef = useRef<HTMLButtonElement>(null)
  const tablePanelRef = useRef<HTMLDivElement>(null)
  const tableMenuRef = useRef<HTMLDivElement>(null)

  // Only existing floors turn into chips; the order is irrelevant, so sort the
  // signature to avoid refreshing on reply-list churn.
  const floorsSignature = floorOptions
    .map((option) => option.floor)
    .sort((a, b) => a - b)
    .join(',')
  const floorSet = useMemo(
    () =>
      new Set(
        floorsSignature === '' ? [] : floorsSignature.split(',').map(Number),
      ),
    [floorsSignature],
  )

  const reference = useReferenceSuggestion({
    panelRef: richPanelRef,
    floorOptions,
    allowOutsidePanel: compact,
  })
  const emoji = useEmojiSuggestion({
    panelRef: richPanelRef,
    allowOutsidePanel: compact,
  })

  const openLinkPopover = useCallback<OpenLinkPopover>(
    (view, from, to, href, text, editing) => {
      const panel = richPanelRef.current
      if (!panel) return

      const coords = view.coordsAtPos(from)
      const panelRect = panel.getBoundingClientRect()

      // 光标滚出编辑器后不再展示浮窗。
      if (!isCaretInsidePanel(coords, panelRect)) {
        setLinkPopover(null)
        return
      }

      setLinkPopover({
        from,
        to,
        href,
        text,
        editing,
        ...anchorPopup(
          coords,
          panelRect,
          LINK_POPUP_WIDTH,
          LINK_POPUP_HEIGHT,
          compact,
        ),
      })
    },
    [compact],
  )

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: createEditorExtensions({
      ...emoji,
      placeholder: compact ? '写下你的跟帖…输入 re# 可引用楼层' : undefined,
    }),
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'moon-editor-content flex-1',
        'aria-label': ariaLabel,
      },
      handlePaste: handleImagePaste,
      handleClick: (view, _pos, event) =>
        handleLinkClick(view, event, {
          openLinkPopover,
          closeLinkPopover: () => setLinkPopover(null),
        }),
      handleDOMEvents: {
        contextmenu: (view, event) =>
          handleCellContextMenu(view, event, {
            openTableMenu: setTableMenu,
            closeTablePicker: () => setTablePicker(null),
            closeLinkPopover: () => setLinkPopover(null),
          }),
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      expandEmojiShortcodes(currentEditor)
    },
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = normalizeMarkdown(currentEditor.getMarkdown())

      lastEmittedMarkdownRef.current = markdown
      onChangeRef.current(markdown)
      reference.update(currentEditor)
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      reference.update(currentEditor)
    },
    onBlur: ({ event }) => {
      // Keep the picker open while focus moves into it to choose an item.
      const nextTarget = event.relatedTarget as Node | null
      const focusInPicker = Boolean(
        nextTarget &&
          (referencePanelRef.current?.contains(nextTarget) ||
            emojiPanelRef.current?.contains(nextTarget)),
      )

      if (!focusInPicker) {
        reference.hide()
        emoji.hide()
      }
      if (!nextTarget || !linkPanelRef.current?.contains(nextTarget)) {
        setLinkPopover(null)
      }
    },
  })

  // Floor chips depend on which floors exist, which can change while the
  // editor is open.
  useEffect(() => {
    if (!editor) return

    setReplyReferenceFloors(editor, floorSet)
  }, [editor, floorSet])

  // Keep the document in sync when the value changes elsewhere (clearing after
  // submit, or edits made in another editor bound to the same state).
  useEffect(() => {
    if (!syncExternalValue) return
    if (value === lastEmittedMarkdownRef.current) return

    lastEmittedMarkdownRef.current = value
    editor.commands.setContent(value, { contentType: 'markdown' })
    expandEmojiShortcodes(editor)
  }, [editor, syncExternalValue, value])

  useImperativeHandle(
    ref,
    () => ({
      appendText(text: string) {
        const current = editor.getText()
        const separator = current !== '' && !/\s$/.test(current) ? ' ' : ''

        editor
          .chain()
          .focus('end')
          .command(({ state, tr, dispatch }) => {
            if (dispatch) {
              tr.insertText(`${separator}${text} `, state.selection.from)
            }
            return true
          })
          .run()
      },
    }),
    [editor],
  )

  useDismissOnOutside({
    active: linkPopover !== null,
    ignoreRefs: [linkPanelRef, richPanelRef],
    onDismiss: () => setLinkPopover(null),
    onEscape: () => editor?.view.focus(),
  })

  useDismissOnOutside({
    active: tablePicker !== null,
    ignoreRefs: [tablePanelRef, tableButtonRef],
    onDismiss: () => setTablePicker(null),
    onEscape: () => tableButtonRef.current?.focus(),
  })

  useDismissOnOutside({
    active: tableMenu !== null,
    ignoreRefs: [tableMenuRef],
    onDismiss: () => setTableMenu(null),
    dismissOnScroll: true,
    onEscape: () => editor?.view.focus(),
  })

  const editorState = useEditorToolbarState(editor)

  function openLinkFromToolbar() {
    if (!editor) return

    const { from, to } = editor.state.selection
    const markRange = editor.isActive('link')
      ? getMarkRange(editor.state.doc.resolve(from), editor.schema.marks.link)
      : undefined

    if (markRange) {
      openLinkPopover(
        editor.view,
        markRange.from,
        markRange.to,
        String(editor.getAttributes('link').href ?? ''),
        editor.state.doc.textBetween(markRange.from, markRange.to, ' '),
        true,
      )
    } else {
      openLinkPopover(
        editor.view,
        from,
        to,
        '',
        editor.state.doc.textBetween(from, to, ' '),
        false,
      )
    }
  }

  function toggleTablePicker() {
    if (tablePicker) {
      setTablePicker(null)
      return
    }

    const button = tableButtonRef.current
    const panel = richPanelRef.current
    if (!button || !panel) return

    const buttonRect = button.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const maxLeft = Math.max(8, panelRect.width - TABLE_PICKER_WIDTH - 8)

    setTablePicker({
      left: Math.min(Math.max(buttonRect.left - panelRect.left, 8), maxLeft),
      top: buttonRect.bottom - panelRect.top + 6,
    })
  }

  function insertTableFromPicker(rows: number, cols: number) {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()
    setTablePicker(null)
  }

  function importMarkdown(markdown: string) {
    if (!editor) return

    editor.commands.setContent(markdown, { contentType: 'markdown' })
    expandEmojiShortcodes(editor)
  }

  function exportMarkdown() {
    downloadMarkdown(normalizeMarkdown(editor?.getMarkdown() ?? value))
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return

    if (emoji.handleKeyDown(event, editor)) return
    reference.handleKeyDown(event, editor)
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        !compact && fillHeight && 'h-full min-h-0',
      )}
    >
      {compact ? null : (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground">正文</span>
          <MarkdownFileMenu
            onImport={importMarkdown}
            onExport={exportMarkdown}
          />
        </div>
      )}

      <div
        ref={richPanelRef}
        className={cn(
          'relative flex flex-col',
          compact
            ? 'min-h-0'
            : fillHeight
              ? 'min-h-48 flex-1'
              : 'h-[calc(20rem+2px)]',
        )}
      >
        {compact ? null : (
          <EditorToolbar
            editor={editor}
            state={editorState}
            tableButtonRef={tableButtonRef}
            tablePickerOpen={tablePicker !== null}
            onToggleTablePicker={toggleTablePicker}
            onOpenLink={openLinkFromToolbar}
          />
        )}

        <div
          className={cn(
            'flex min-h-0 flex-col',
            compact
              ? 'max-h-44 min-h-32 overflow-y-auto'
              : 'flex-1 overflow-y-auto rounded-field border border-field-border bg-field shadow-field transition duration-150 hover:border-field-border-hover focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field',
          )}
          onKeyDownCapture={handlePickerKeyDown}
          onScroll={() => {
            setTableMenu(null)

            if (reference.trigger && editor) reference.update(editor)

            emoji.refreshPosition()
          }}
        >
          <EditorContent editor={editor} className="flex flex-1 flex-col" />
        </div>

        {emoji.visible && emoji.suggestion ? (
          <EmojiPicker
            panelRef={emojiPanelRef}
            suggestion={emoji.suggestion}
            activeIndex={emoji.activeIndex}
            onChoose={emoji.choose}
            onHover={emoji.setActiveIndex}
          />
        ) : null}

        {reference.visible && reference.trigger ? (
          <ReferencePicker
            panelRef={referencePanelRef}
            trigger={reference.trigger}
            options={reference.options}
            activeIndex={reference.activeIndex}
            onChoose={(option) => {
              if (editor) reference.choose(editor, option)
            }}
            onHover={reference.setActiveIndex}
          />
        ) : null}

        {tablePicker ? (
          <TablePicker
            panelRef={tablePanelRef}
            position={tablePicker}
            onInsert={insertTableFromPicker}
          />
        ) : null}

        {tableMenu ? (
          <TableMenu
            editor={editor}
            panelRef={tableMenuRef}
            position={tableMenu}
            canMergeCells={editorState.canMergeCells}
            canSplitCell={editorState.canSplitCell}
            onClose={() => setTableMenu(null)}
          />
        ) : null}

        {linkPopover && editor ? (
          <LinkPopover
            key={`${linkPopover.from}-${linkPopover.to}-${linkPopover.editing}-${linkPopover.href}`}
            editor={editor}
            state={linkPopover}
            panelRef={linkPanelRef}
            onClose={() => setLinkPopover(null)}
          />
        ) : null}
      </div>
    </div>
  )
}