import { getMarkRange, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { cn } from '@heroui/react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { downloadHtml, downloadMarkdown } from '@/lib/export-document'
import { expandEmojiShortcodes } from '@/lib/tiptap-emoji-shortcodes'
import { canApplyFeature } from '@/lib/tiptap-formatting-context'
import {
  hasReplyReference,
  replyReferenceSpacing,
} from '@/lib/tiptap-reply-references'

import { EditorToolbar } from './EditorToolbar'
import { EmojiPicker } from './EmojiPicker'
import { ImageAlignToolbar } from './ImageAlignToolbar'
import { ImagePopover } from './ImagePopover'
import { LinkPopover } from './LinkPopover'
import { ReferencePicker } from './ReferencePicker'
import { TableMenu } from './TableMenu'
import { TablePicker } from './TablePicker'
import {
  COMPACT_EDITOR_HEIGHT,
  COMPACT_EDITOR_LINE_HEIGHT,
  COMPACT_EDITOR_MAX_HEIGHT,
  IMAGE_ALIGN_TOOLBAR_HEIGHT,
  IMAGE_ALIGN_TOOLBAR_WIDTH,
  IMAGE_POPUP_HEIGHT,
  IMAGE_POPUP_WIDTH,
  LINK_POPUP_HEIGHT,
  LINK_POPUP_WIDTH,
  TABLE_PICKER_WIDTH,
} from './editor-constants'
import { createEditorExtensions } from './editor-extensions'
import {
  handleCellContextMenu,
  handleImageClick,
  handleImageDrop,
  handleImagePaste,
  handleLinkClick,
  handleSingleLinePaste,
} from './editor-handlers'
import type {
  ImageAlignState,
  ImagePopoverState,
  LinkPopoverState,
  OpenLinkPopover,
  RichTextEditorProps,
  TablePanelPosition,
} from './editor-types'
import {
  anchorPopup,
  hasDocLineBreak,
  imageElementAt,
  isCaretInsidePanel,
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
  advanced = true,
  syncExternalValue = true,
  floorOptions = [],
  onQuickSendChange,
  ref,
}: RichTextEditorProps) {
  const [linkPopover, setLinkPopover] = useState<LinkPopoverState | null>(null)
  const [tablePicker, setTablePicker] = useState<TablePanelPosition | null>(
    null,
  )
  const [tableMenu, setTableMenu] = useState<TablePanelPosition | null>(null)
  const [imagePopover, setImagePopover] = useState<ImagePopoverState | null>(
    null,
  )
  const [imageAlign, setImageAlign] = useState<ImageAlignState | null>(null)
  const [compactHeight, setCompactHeight] = useState(COMPACT_EDITOR_HEIGHT)
  const resizeStartRef = useRef<{ pointerY: number; height: number } | null>(
    null,
  )

  const onChangeRef = useRef(onChange)
  // Tracks what this editor emitted so external resets can be told apart from
  // the parent echoing our own changes back through `value`.
  const lastEmittedHtmlRef = useRef(value)
  const richPanelRef = useRef<HTMLDivElement>(null)
  const referencePanelRef = useRef<HTMLDivElement>(null)
  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const linkPanelRef = useRef<HTMLDivElement>(null)
  const tableButtonRef = useRef<HTMLButtonElement>(null)
  const tablePanelRef = useRef<HTMLDivElement>(null)
  const tableMenuRef = useRef<HTMLDivElement>(null)
  const imageButtonRef = useRef<HTMLButtonElement>(null)
  const imagePanelRef = useRef<HTMLDivElement>(null)
  const imageAlignPanelRef = useRef<HTMLDivElement>(null)

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
    contentType: 'html',
    editorProps: {
      attributes: {
        class: compact
          ? 'moon-rich-text moon-editor-content moon-editor-content-compact flex-1'
          : 'moon-rich-text moon-editor-content flex-1',
        'aria-label': ariaLabel,
      },
      handlePaste: (view, event) =>
        quickSend
          ? handleSingleLinePaste(view, event)
          : handleImagePaste(view, event),
      // Without this the browser opens a dropped image file in a new tab.
      handleDrop: (view, event, _slice, moved) =>
        handleImageDrop(view, event, moved),
      handleClick: (view, _pos, event) => {
        const openedLink = handleLinkClick(view, event, {
          openLinkPopover,
          closeLinkPopover: () => setLinkPopover(null),
        })

        handleImageClick(view, event, {
          openImageToolbar: openImageAlignToolbar,
          closeImageToolbar: () => setImageAlign(null),
        })
        return openedLink
      },
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
      raiseCompactHeightFor(currentEditor.state.doc)
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML()

      lastEmittedHtmlRef.current = html
      onChangeRef.current(html)
      reference.update(currentEditor)
      raiseCompactHeightFor(currentEditor.state.doc)
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      reference.update(currentEditor)

      // 选区离开图片后关闭对齐工具条。
      setImageAlign((current) => {
        if (!current) return null
        const { selection } = currentEditor.state
        return selection instanceof NodeSelection &&
          selection.from === current.pos
          ? current
          : null
      })

      // Close panels whose action is no longer available for this caret.
      if (!canApplyFeature(currentEditor.state, 'tableInsert')) {
        setTablePicker(null)
      }
      if (!canApplyFeature(currentEditor.state, 'link')) {
        setLinkPopover(null)
      }
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

  const hasLineBreak: boolean = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) =>
      hasDocLineBreak(currentEditor.state.doc),
  })
  // 有换行时收成一行会藏住内容，收起的最小高度停在默认紧凑高度。
  const minCompactHeight = hasLineBreak
    ? COMPACT_EDITOR_HEIGHT
    : COMPACT_EDITOR_LINE_HEIGHT
  const quickSend: boolean =
    compact && !hasLineBreak && compactHeight <= COMPACT_EDITOR_LINE_HEIGHT

  /** 文档含换行时撑开高度，避免收到单行。 */
  function raiseCompactHeightFor(doc: ProseMirrorNode) {
    if (!hasDocLineBreak(doc)) return

    setCompactHeight((height) => Math.max(height, COMPACT_EDITOR_HEIGHT))
  }

  // Keep the document in sync when the value changes elsewhere (clearing after
  // submit, or edits made in another editor bound to the same state).
  useEffect(() => {
    if (!syncExternalValue) return
    if (value === lastEmittedHtmlRef.current) return

    lastEmittedHtmlRef.current = value
    // The parent already has this exact HTML; re-emitting it would echo back.
    editor.commands.setContent(value, {
      contentType: 'html',
      emitUpdate: false,
    })
    expandEmojiShortcodes(editor)
    raiseCompactHeightFor(editor.state.doc)
  }, [editor, syncExternalValue, value])

  useImperativeHandle(
    ref,
    () => ({
      appendReplyReference(floor: number) {
        // The floor is already quoted: leave the document alone so the caller
        // can emphasize the composer instead of adding a duplicate chip.
        if (hasReplyReference(editor.state.doc, floor)) {
          editor.commands.focus('end')
          return false
        }

        editor
          .chain()
          .focus('end')
          .command(({ state, tr, dispatch }) => {
            if (!dispatch) return true

            const { $from } = state.selection
            const before = $from.parent.textBetween(0, $from.parentOffset)
            const { leading, trailing } = replyReferenceSpacing(before, '')
            const chip = state.schema.nodes.replyReference.create({ floor })

            tr.insert(state.selection.from, [
              ...(leading ? [state.schema.text(leading)] : []),
              chip,
              ...(trailing ? [state.schema.text(trailing)] : []),
            ])

            return true
          })
          .run()

        return true
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
    active: imagePopover !== null,
    ignoreRefs: [imagePanelRef, imageButtonRef],
    onDismiss: () => setImagePopover(null),
    onEscape: () => editor?.view.focus(),
    dismissOnScroll: true,
  })

  useDismissOnOutside({
    active: imageAlign !== null,
    ignoreRefs: [imageAlignPanelRef],
    onDismiss: () => setImageAlign(null),
    onEscape: () => editor?.view.focus(),
    dismissOnScroll: true,
  })

  useDismissOnOutside({
    active: tableMenu !== null,
    ignoreRefs: [tableMenuRef],
    onDismiss: () => setTableMenu(null),
    dismissOnScroll: true,
    onEscape: () => editor?.view.focus(),
  })

  const editorState = useEditorToolbarState(editor)

  function openImageAlignToolbar(view: Editor['view'], pos: number) {
    const image = imageElementAt(view, pos)
    if (!image) return

    const rect = image.getBoundingClientRect()
    const maxLeft = Math.max(
      8,
      window.innerWidth - IMAGE_ALIGN_TOOLBAR_WIDTH - 8,
    )
    // 图片可能比编辑区宽，按视口内可见的部分居中。
    const visibleLeft = Math.max(rect.left, 8)
    const visibleRight = Math.min(rect.right, window.innerWidth - 8)
    const centered =
      (visibleLeft + visibleRight) / 2 - IMAGE_ALIGN_TOOLBAR_WIDTH / 2

    // 优先放在图片上方；放不下时放到下方，并保证留在视口内。
    let top = rect.top - IMAGE_ALIGN_TOOLBAR_HEIGHT - 8
    if (top < 8) {
      top = Math.min(
        rect.bottom + 8,
        window.innerHeight - IMAGE_ALIGN_TOOLBAR_HEIGHT - 8,
      )
    }

    setLinkPopover(null)
    setTablePicker(null)
    setImagePopover(null)
    setImageAlign({
      pos,
      left: Math.min(Math.max(centered, 8), maxLeft),
      top: Math.max(top, 8),
    })
  }

  function openLinkFromToolbar() {
    if (!editor) return

    setImageAlign(null)

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

    if (!editor) return

    const button = tableButtonRef.current
    const panel = richPanelRef.current
    if (!button || !panel) return

    const buttonRect = button.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    const maxLeft = Math.max(8, panelRect.width - TABLE_PICKER_WIDTH - 8)

    setImageAlign(null)
    setTablePicker({
      left: Math.min(Math.max(buttonRect.left - panelRect.left, 8), maxLeft),
      top: buttonRect.bottom - panelRect.top + 6,
    })
  }

  function toggleImagePopover() {
    if (imagePopover) {
      setImagePopover(null)
      return
    }

    if (!editor) return

    const button = imageButtonRef.current
    if (!button) return

    const buttonRect = button.getBoundingClientRect()
    const maxLeft = Math.max(8, window.innerWidth - IMAGE_POPUP_WIDTH - 8)
    const above =
      buttonRect.bottom + IMAGE_POPUP_HEIGHT > window.innerHeight &&
      buttonRect.top - IMAGE_POPUP_HEIGHT > 8

    // 焦点在图片上时，浮窗直接显示该图片的调控选项。
    const { selection } = editor.state
    const imagePos =
      selection instanceof NodeSelection &&
      editor.state.doc.nodeAt(selection.from)?.type.name === 'image'
        ? selection.from
        : null

    setImageAlign(null)
    setImagePopover({
      imagePos,
      above,
      left: Math.min(Math.max(buttonRect.left, 8), maxLeft),
      top: above ? buttonRect.top - 6 : buttonRect.bottom + 6,
    })
  }

  function insertTableFromPicker(rows: number, cols: number) {
    if (!editor) {
      setTablePicker(null)
      return
    }

    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()
    setTablePicker(null)
  }

  /** Markdown import is an explicit conversion into the rich-text document. */
  function importMarkdown(markdown: string) {
    if (!editor) return

    editor.commands.setContent(markdown, { contentType: 'markdown' })
    expandEmojiShortcodes(editor)
  }

  function exportMarkdown() {
    if (!editor) return

    downloadMarkdown(editor.getMarkdown())
  }

  function exportHtml() {
    downloadHtml(editor?.getHTML() ?? value)
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return

    // 单行状态下回车等同于单行输入框的提交，不产生换行。
    if (quickSend && event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.closest('form')?.requestSubmit()
      return
    }

    if (emoji.handleKeyDown(event, editor)) return
    reference.handleKeyDown(event, editor)
  }

  function clampCompactHeight(height: number) {
    return Math.min(
      COMPACT_EDITOR_MAX_HEIGHT,
      Math.max(minCompactHeight, height),
    )
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault()
    resizeStartRef.current = {
      pointerY: event.clientY,
      height: compactHeight,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function resizeByDrag(event: PointerEvent<HTMLDivElement>) {
    const start = resizeStartRef.current
    if (!start) return

    // 上边缘拖动：指针上移时编辑器变高。
    setCompactHeight(
      clampCompactHeight(start.height + start.pointerY - event.clientY),
    )
  }

  function endResize(event: PointerEvent<HTMLDivElement>) {
    if (!resizeStartRef.current) return

    resizeStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    const step = event.key === 'ArrowUp' ? 16 : -16
    setCompactHeight((height) => clampCompactHeight(height + step))
  }

  useEffect(() => {
    onQuickSendChange?.(quickSend)
  }, [onQuickSendChange, quickSend])

  useEffect(() => {
    editor.view.dom.classList.toggle('moon-editor-content-quick', quickSend)
  }, [editor, quickSend])

  const toolbar = (
    <EditorToolbar
      editor={editor}
      state={editorState}
      tableButtonRef={tableButtonRef}
      tablePickerOpen={tablePicker !== null}
      onToggleTablePicker={toggleTablePicker}
      imageButtonRef={imageButtonRef}
      imagePopoverOpen={imagePopover !== null}
      onToggleImagePopover={toggleImagePopover}
      onOpenLink={openLinkFromToolbar}
      onImportMarkdown={importMarkdown}
      onExportMarkdown={exportMarkdown}
      onExportHtml={exportHtml}
      minimal={compact || !advanced}
      className={compact ? 'px-2 pt-1.5' : 'mb-2'}
    />
  )

  return (
    <div
      className={cn(
        'flex flex-col',
        !compact && fillHeight && 'h-full min-h-0',
      )}
    >
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
        {compact ? (
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="拖动调整编辑器高度"
            tabIndex={0}
            className="group absolute top-0 left-1/2 z-10 flex h-2.5 w-24 -translate-x-1/2 cursor-ns-resize touch-none items-center justify-center outline-none focus-visible:bg-default-soft"
            onPointerDown={startResize}
            onPointerMove={resizeByDrag}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onKeyDown={handleResizeKeyDown}
          >
            <span
              aria-hidden="true"
              className="h-0.5 w-8 rounded-full bg-separator transition-colors group-hover:bg-muted"
            />
          </div>
        ) : null}

        {compact ? (
          <div
            inert={quickSend}
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
              quickSend ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="min-h-0 overflow-hidden">{toolbar}</div>
          </div>
        ) : (
          toolbar
        )}

        <div
          className={cn(
            'flex min-h-0 flex-col',
            compact
              ? 'overflow-auto'
              : 'flex-1 overflow-auto rounded-field border border-field-border bg-field shadow-field transition duration-150 hover:not-focus-within:border-field-border-hover focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field',
          )}
          style={compact ? { height: compactHeight } : undefined}
          onKeyDownCapture={handlePickerKeyDown}
          onScroll={() => {
            setTableMenu(null)
            setImageAlign(null)

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

        {imagePopover && editor ? (
          <ImagePopover
            editor={editor}
            state={imagePopover}
            panelRef={imagePanelRef}
            onClose={() => setImagePopover(null)}
          />
        ) : null}

        {imageAlign && editor ? (
          <ImageAlignToolbar
            key={imageAlign.pos}
            editor={editor}
            state={imageAlign}
            panelRef={imageAlignPanelRef}
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