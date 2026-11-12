import type { Editor } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  exitSuggestion,
  type SuggestionProps,
} from '@tiptap/suggestion'
import { Button, cn, ListBox, Surface, Tabs, TextArea } from '@heroui/react'
import {
  Bold,
  Code,
  Code2,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'
import type { ReplyReferenceOption } from '@/lib/reply-reference-options'
import {
  EmojiShortcodes,
  EmojiSuggestionPluginKey,
  expandEmojiShortcodes,
} from '@/lib/tiptap-emoji-shortcodes'
import { MarkdownShortcuts } from '@/lib/tiptap-markdown-shortcuts'
import {
  ReplyReferenceChips,
  setReplyReferenceFloors,
} from '@/lib/tiptap-reply-references'

type EditorMode = 'rich' | 'markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  defaultMode?: EditorMode
  showModeSwitch?: boolean
  fillHeight?: boolean
  /** 传入后，富文本中输入 re# 会提示可引用的楼层 */
  floorOptions?: ReplyReferenceOption[]
}

interface ReferenceTrigger {
  /** re# 在文档中的起始位置 */
  from: number
  /** 光标位置，也是 re#楼层号 的结束位置 */
  to: number
  /** 已输入的楼层号前缀 */
  query: string
  left: number
  top: number
  above: boolean
}

interface EmojiSuggestion {
  items: EmojiSuggestionItem[]
  query: string
  command: (item: EmojiSuggestionItem) => void
  left: number
  top: number
  above: boolean
}

const POPUP_WIDTH = 288
const POPUP_HEIGHT = 240
const EMOJI_POPUP_WIDTH = 256
const EMOJI_POPUP_HEIGHT = 256
/** 匹配光标前刚输入的 re#楼层号（楼层号可以还没输入） */
const REFERENCE_QUERY_PATTERN = /(?:^|[^\p{L}\p{N}_])(re#(\d*))$/u

/** Floor references use a non-breaking separator while editing; save a plain space. */
function normalizeMarkdown(markdown: string) {
  return markdown.replace(/(re#\d+)\u00A0/g, '$1 ')
}

export function MarkdownEditor({
  value,
  onChange,
  defaultMode = 'rich',
  showModeSwitch = true,
  fillHeight = false,
  floorOptions = [],
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>(defaultMode)
  const [prevShowModeSwitch, setPrevShowModeSwitch] = useState(showModeSwitch)
  const [referenceTrigger, setReferenceTrigger] =
    useState<ReferenceTrigger | null>(null)
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0)
  const [emojiSuggestion, setEmojiSuggestion] =
    useState<EmojiSuggestion | null>(null)
  const [activeEmojiIndex, setActiveEmojiIndex] = useState(0)
  const activeMode = showModeSwitch ? mode : 'markdown'
  const onChangeRef = useRef(onChange)
  const richPanelRef = useRef<HTMLDivElement>(null)
  const referencePanelRef = useRef<HTMLDivElement>(null)
  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const emojiSuggestionPropsRef =
    useRef<SuggestionProps<EmojiSuggestionItem, EmojiSuggestionItem> | null>(null)
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

  const updateReferenceTrigger = useCallback((currentEditor: Editor) => {
    const { selection } = currentEditor.state
    const panel = richPanelRef.current

    if (
      !panel ||
      !selection.empty ||
      !selection.$from.parent.isTextblock ||
      currentEditor.isActive('code') ||
      currentEditor.isActive('codeBlock')
    ) {
      setReferenceTrigger(null)
      return
    }

    const textBefore = selection.$from.parent.textBetween(
      0,
      selection.$from.parentOffset,
    )
    const match = REFERENCE_QUERY_PATTERN.exec(textBefore)

    if (!match) {
      setReferenceTrigger(null)
      return
    }

    const coords = currentEditor.view.coordsAtPos(selection.from)
    const panelRect = panel.getBoundingClientRect()

    // Close the picker if the caret has scrolled out of the editor.
    if (coords.bottom < panelRect.top || coords.top > panelRect.bottom) {
      setReferenceTrigger(null)
      return
    }

    const above =
      coords.bottom + POPUP_HEIGHT > window.innerHeight &&
      coords.top - POPUP_HEIGHT > panelRect.top
    const maxLeft = Math.max(8, panelRect.width - POPUP_WIDTH - 8)

    setReferenceTrigger({
      from: selection.from - match[1].length,
      to: selection.from,
      query: match[2],
      left: Math.min(Math.max(coords.left - panelRect.left, 8), maxLeft),
      top: above
        ? coords.top - panelRect.top - 6
        : coords.bottom - panelRect.top + 6,
      above,
    })
    setActiveReferenceIndex(0)
  }, [])

  const updateEmojiSuggestion = useCallback(
    (props: SuggestionProps<EmojiSuggestionItem, EmojiSuggestionItem>, resetIndex = true) => {
      emojiSuggestionPropsRef.current = props

      const panel = richPanelRef.current

      // No matches: the picker stays hidden until the query matches again.
      if (!panel || props.items.length === 0) {
        setEmojiSuggestion(null)
        return
      }

      const coords = props.editor.view.coordsAtPos(props.range.to)
      const panelRect = panel.getBoundingClientRect()

      // Close the picker if the caret has scrolled out of the editor.
      if (coords.bottom < panelRect.top || coords.top > panelRect.bottom) {
        setEmojiSuggestion(null)
        return
      }

      const above =
        coords.bottom + EMOJI_POPUP_HEIGHT > window.innerHeight &&
        coords.top - EMOJI_POPUP_HEIGHT > panelRect.top
      const maxLeft = Math.max(8, panelRect.width - EMOJI_POPUP_WIDTH - 8)

      setEmojiSuggestion({
        items: props.items,
        query: props.query,
        command: props.command,
        left: Math.min(Math.max(coords.left - panelRect.left, 8), maxLeft),
        top: above
          ? coords.top - panelRect.top - 6
          : coords.bottom - panelRect.top + 6,
        above,
      })

      if (resetIndex) setActiveEmojiIndex(0)
    },
    [],
  )

  const closeEmojiSuggestion = useCallback((currentEditor: Editor) => {
    exitSuggestion(currentEditor.view, EmojiSuggestionPluginKey)
    emojiSuggestionPropsRef.current = null
    setEmojiSuggestion(null)
  }, [])

  if (prevShowModeSwitch !== showModeSwitch) {
    setPrevShowModeSwitch(showModeSwitch)
    if (!showModeSwitch) setMode('markdown')
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
        },
      }),
      Markdown,
      MarkdownShortcuts,
      EmojiShortcodes.configure({
        suggestion: {
          render: () => ({
            onStart: updateEmojiSuggestion,
            onUpdate: updateEmojiSuggestion,
            onExit: () => {
              emojiSuggestionPropsRef.current = null
              setEmojiSuggestion(null)
            },
          }),
        },
      }),
      ReplyReferenceChips,
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'moon-editor-content flex-1',
        'aria-label': '正文',
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      if ((showModeSwitch ? mode : 'markdown') === 'rich') {
        expandEmojiShortcodes(currentEditor)
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current(normalizeMarkdown(currentEditor.getMarkdown()))
      updateReferenceTrigger(currentEditor)
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      updateReferenceTrigger(currentEditor)
    },
    onBlur: ({ event }) => {
      // Keep the picker open while focus moves into it to choose an item.
      const nextTarget = event.relatedTarget as Node | null
      if (nextTarget && referencePanelRef.current?.contains(nextTarget)) return
      if (nextTarget && emojiPanelRef.current?.contains(nextTarget)) return

      setReferenceTrigger(null)
      emojiSuggestionPropsRef.current = null
      setEmojiSuggestion(null)
    },
  })

  // Floor chips depend on which floors exist, which can change while the
  // editor is open.
  useEffect(() => {
    if (!editor) return

    setReplyReferenceFloors(editor, floorSet)
  }, [editor, floorSet])

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor.isActive('bold'),
      isItalic: currentEditor.isActive('italic'),
      isStrike: currentEditor.isActive('strike'),
      isHeading: currentEditor.isActive('heading', { level: 2 }),
      isBulletList: currentEditor.isActive('bulletList'),
      isOrderedList: currentEditor.isActive('orderedList'),
      isBlockquote: currentEditor.isActive('blockquote'),
      isCode: currentEditor.isActive('code'),
      isCodeBlock: currentEditor.isActive('codeBlock'),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    }),
  })

  const referenceOptions = referenceTrigger
    ? floorOptions.filter((option) =>
        String(option.floor).startsWith(referenceTrigger.query),
      )
    : []
  const referenceActiveIndex = Math.min(
    activeReferenceIndex,
    Math.max(referenceOptions.length - 1, 0),
  )
  const referenceVisible =
    activeMode === 'rich' &&
    referenceTrigger !== null &&
    floorOptions.length > 0
  const emojiActiveIndex = Math.min(
    activeEmojiIndex,
    Math.max((emojiSuggestion?.items.length ?? 0) - 1, 0),
  )
  const emojiVisible =
    activeMode === 'rich' &&
    emojiSuggestion !== null &&
    emojiSuggestion.items.length > 0

  function chooseEmoji(item: EmojiSuggestionItem) {
    emojiSuggestion?.command(item)
    emojiSuggestionPropsRef.current = null
    setEmojiSuggestion(null)
  }

  function chooseReference(option: ReplyReferenceOption) {
    if (!editor || !referenceTrigger) return

    const { from, to } = referenceTrigger

    // Insert literally instead of via HTML parsing. A non-breaking space keeps
    // the separator from being swallowed when the caret is at the end of the
    // paragraph and the next character is typed.
    editor.view.dispatch(
      editor.state.tr.insertText(`re#${option.floor}\u00A0`, from, to),
    )
    editor.view.focus()
    setReferenceTrigger(null)
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return

    if (emojiVisible && emojiSuggestion) {
      const { items } = emojiSuggestion

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setActiveEmojiIndex((index) => (index + 1) % items.length)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setActiveEmojiIndex(
          (index) => (index - 1 + items.length) % items.length,
        )
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        event.stopPropagation()
        chooseEmoji(items[emojiActiveIndex])
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        if (editor) closeEmojiSuggestion(editor)
      } else {
        // Let every other key reach the editor and refine the query.
        return
      }

      return
    }

    if (!referenceTrigger || referenceOptions.length === 0) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      setActiveReferenceIndex(
        (index) => (index + 1) % referenceOptions.length,
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      setActiveReferenceIndex(
        (index) =>
          (index - 1 + referenceOptions.length) % referenceOptions.length,
      )
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      event.stopPropagation()
      chooseReference(referenceOptions[referenceActiveIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setReferenceTrigger(null)
    }
  }

  function switchMode(nextMode: EditorMode) {
    if (nextMode === mode) return

    setReferenceTrigger(null)
    if (editor) closeEmojiSuggestion(editor)

    if (nextMode === 'markdown') {
      onChange(normalizeMarkdown(editor?.getMarkdown() ?? value))
    } else if (editor) {
      editor.commands.setContent(value, { contentType: 'markdown' })
      expandEmojiShortcodes(editor)
    }

    setMode(nextMode)
  }

  const markdownPanel = (
    <TextArea
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Markdown 正文"
      placeholder="用 Markdown 写下正文…"
      className="block h-full resize-none font-mono text-sm leading-6"
    />
  )

  // Without the mode switch there are no tabs, so rendering a tab list would
  // be wrong (and React Aria warns about a panel without a tab list on every
  // render). Render the markdown editor on its own instead.
  if (!showModeSwitch) {
    return (
      <div
        className={cn(
          'block',
          fillHeight && 'flex h-full min-h-0 flex-col gap-0',
        )}
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
          <span className="text-sm font-medium text-foreground">正文</span>
        </div>
        <div
          className={cn(
            'mt-0 w-full p-0 outline-none',
            fillHeight
              ? 'flex min-h-48 flex-1 flex-col'
              : 'h-[calc(20rem+2px)]',
          )}
        >
          {markdownPanel}
        </div>
      </div>
    )
  }

  return (
    <Tabs
      selectedKey={activeMode}
      onSelectionChange={(key) => switchMode(key as EditorMode)}
      className={cn(
        'block',
        fillHeight && 'flex h-full min-h-0 flex-col gap-0',
      )}
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-4">
        <span className="text-sm font-medium text-foreground">正文</span>
        <Tabs.ListContainer>
          <Tabs.List aria-label="编辑模式">
            <Tabs.Tab id="rich">
              富文本
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="markdown">
              Markdown
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </div>

      <Tabs.Panel
        ref={richPanelRef}
        id="rich"
        className={cn(
          'relative mt-0 flex flex-col p-0',
          fillHeight ? 'min-h-48 flex-1' : 'h-[calc(20rem+2px)]',
        )}
      >
        <div
          role="toolbar"
          aria-label="格式工具栏"
          className="mb-2 flex shrink-0 flex-wrap items-center gap-0.5"
        >
          <ToolbarButton
            label="粗体"
            active={editorState.isBold}
            onPress={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold />
          </ToolbarButton>
          <ToolbarButton
            label="斜体"
            active={editorState.isItalic}
            onPress={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic />
          </ToolbarButton>
          <ToolbarButton
            label="删除线"
            active={editorState.isStrike}
            onPress={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough />
          </ToolbarButton>
          <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />
          <ToolbarButton
            label="二级标题"
            active={editorState.isHeading}
            onPress={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 />
          </ToolbarButton>
          <ToolbarButton
            label="无序列表"
            active={editorState.isBulletList}
            onPress={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List />
          </ToolbarButton>
          <ToolbarButton
            label="有序列表"
            active={editorState.isOrderedList}
            onPress={() =>
              editor?.chain().focus().toggleOrderedList().run()
            }
          >
            <ListOrdered />
          </ToolbarButton>
          <ToolbarButton
            label="引用"
            active={editorState.isBlockquote}
            onPress={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote />
          </ToolbarButton>
          <ToolbarButton
            label="行内代码"
            active={editorState.isCode}
            onPress={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code />
          </ToolbarButton>
          <ToolbarButton
            label="代码块"
            active={editorState.isCodeBlock}
            onPress={() =>
              editor?.chain().focus().toggleCodeBlock().run()
            }
          >
            <Code2 />
          </ToolbarButton>
          <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />
          <ToolbarButton
            label="撤销"
            disabled={!editorState.canUndo}
            onPress={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 />
          </ToolbarButton>
          <ToolbarButton
            label="重做"
            disabled={!editorState.canRedo}
            onPress={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 />
          </ToolbarButton>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-field border border-field-border bg-field shadow-field transition duration-150 hover:border-field-border-hover focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field"
          onKeyDownCapture={handlePickerKeyDown}
          onScroll={() => {
            if (referenceTrigger && editor) updateReferenceTrigger(editor)

            const props = emojiSuggestionPropsRef.current
            if (props) updateEmojiSuggestion(props, false)
          }}
        >
          <EditorContent editor={editor} className="flex flex-1 flex-col" />
        </div>

        {emojiVisible && emojiSuggestion ? (
          <Surface
            ref={emojiPanelRef}
            className="absolute z-20 w-64 max-w-[calc(100%_-_1rem)] overflow-hidden rounded-xl border border-field-border shadow-lg"
            style={{
              left: emojiSuggestion.left,
              top: emojiSuggestion.top,
              transform: emojiSuggestion.above
                ? 'translateY(-100%)'
                : undefined,
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <p className="px-2 pt-1.5 pb-1 text-xs text-muted">
              表情
              {emojiSuggestion.query ? ` · :${emojiSuggestion.query}` : ''}
            </p>

            <div className="max-h-56 overflow-y-auto">
              <ListBox
                aria-label="选择表情"
                selectionMode="single"
                selectedKeys={
                  emojiSuggestion.items[emojiActiveIndex]
                    ? [emojiSuggestion.items[emojiActiveIndex].name]
                    : []
                }
                className="pb-1"
              >
                {emojiSuggestion.items.map((item, index) => (
                  <ListBox.Item
                    key={item.name}
                    id={item.name}
                    textValue={`:${item.name}:`}
                    onPress={() => chooseEmoji(item)}
                    onHoverStart={() => setActiveEmojiIndex(index)}
                    className="rounded-lg aria-selected:bg-default"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center text-lg"
                      aria-hidden="true"
                    >
                      {item.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      :{item.name}:
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </div>
          </Surface>
        ) : null}

        {referenceVisible && referenceTrigger ? (
          <Surface
            ref={referencePanelRef}
            className="absolute z-20 w-72 max-w-[calc(100%_-_1rem)] overflow-hidden rounded-xl border border-field-border shadow-lg"
            style={{
              left: referenceTrigger.left,
              top: referenceTrigger.top,
              transform: referenceTrigger.above
                ? 'translateY(-100%)'
                : undefined,
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <p className="px-2 pt-1.5 pb-1 text-xs text-muted">
              回复楼层
              {referenceTrigger.query ? ` · #${referenceTrigger.query}` : ''}
            </p>

            <div className="max-h-56 overflow-y-auto">
              <ListBox
                aria-label="选择要回复的楼层"
                selectionMode="single"
                selectedKeys={
                  referenceOptions[referenceActiveIndex]
                    ? [String(referenceOptions[referenceActiveIndex].floor)]
                    : []
                }
                renderEmptyState={() => (
                  <p className="px-2 py-2 text-sm text-muted">
                    没有匹配的楼层。
                  </p>
                )}
                className="pb-1"
              >
                {referenceOptions.map((option, index) => (
                  <ListBox.Item
                    key={option.floor}
                    id={String(option.floor)}
                    textValue={`#${option.floor} ${option.name}`}
                    onPress={() => chooseReference(option)}
                    onHoverStart={() => setActiveReferenceIndex(index)}
                    className="rounded-lg aria-selected:bg-default"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-default text-xs font-medium tabular-nums">
                      #{option.floor}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {option.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {option.excerpt || '（无内容）'}
                      </span>
                    </span>
                  </ListBox.Item>
                ))}
              </ListBox>
            </div>
          </Surface>
        ) : null}
      </Tabs.Panel>

      <Tabs.Panel
        id="markdown"
        className={cn(
          'mt-0 p-0',
          fillHeight ? 'flex min-h-48 flex-1 flex-col' : 'h-[calc(20rem+2px)]',
        )}
      >
        {markdownPanel}
      </Tabs.Panel>
    </Tabs>
  )
}

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onPress,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      isIconOnly
      variant={active ? 'secondary' : 'ghost'}
      aria-label={label}
      isDisabled={disabled}
      onPress={onPress}
    >
      {children}
    </Button>
  )
}
