import { getMarkRange, type Editor } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Markdown } from '@tiptap/markdown'
import { TextSelection } from '@tiptap/pm/state'
import { CellSelection } from '@tiptap/pm/tables'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  exitSuggestion,
  type SuggestionProps,
} from '@tiptap/suggestion'
import {
  Button,
  cn,
  Dropdown,
  Input,
  ListBox,
  Menu,
  MenuItem,
  MenuSection,
  Surface,
  Tabs,
  TextArea,
} from '@heroui/react'
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
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

interface LinkPopover {
  /** 链接文本在文档中的范围；from === to 表示没有选中文本，需要插入新链接 */
  from: number
  to: number
  left: number
  top: number
  above: boolean
  /** 正在编辑已有链接（否则为插入新链接） */
  editing: boolean
}

const POPUP_WIDTH = 288
const POPUP_HEIGHT = 240
const EMOJI_POPUP_WIDTH = 256
const EMOJI_POPUP_HEIGHT = 256
const LINK_POPUP_WIDTH = 320
const LINK_POPUP_HEIGHT = 232
const TABLE_PICKER_WIDTH = 224
const TABLE_GRID_ROWS = 8
const TABLE_GRID_COLUMNS = 8
const TABLE_MENU_WIDTH = 224
const TABLE_MENU_MAX_HEIGHT = 480

const HEADING_LEVELS = [
  { level: 1, label: '一级标题', icon: Heading1 },
  { level: 2, label: '二级标题', icon: Heading2 },
  { level: 3, label: '三级标题', icon: Heading3 },
  { level: 4, label: '四级标题', icon: Heading4 },
  { level: 5, label: '五级标题', icon: Heading5 },
  { level: 6, label: '六级标题', icon: Heading6 },
] as const

const TABLE_ACTIONS = [
  { id: 'addRowBefore', label: '在上方插入行' },
  { id: 'addRowAfter', label: '在下方插入行' },
  { id: 'deleteRow', label: '删除当前行' },
  { id: 'addColumnBefore', label: '在左侧插入列' },
  { id: 'addColumnAfter', label: '在右侧插入列' },
  { id: 'deleteColumn', label: '删除当前列' },
  { id: 'mergeCells', label: '合并单元格' },
  { id: 'splitCell', label: '拆分单元格' },
  { id: 'toggleHeaderRow', label: '切换表头行' },
  { id: 'toggleHeaderColumn', label: '切换表头列' },
  { id: 'toggleHeaderCell', label: '切换表头单元格' },
  { id: 'deleteTable', label: '删除表格' },
] as const

/** 右键单元格时按用途分组展示的表格操作。 */
const TABLE_MENU_GROUPS = [
  { label: '行', actions: ['addRowBefore', 'addRowAfter', 'deleteRow'] },
  {
    label: '列',
    actions: ['addColumnBefore', 'addColumnAfter', 'deleteColumn'],
  },
  { label: '单元格', actions: ['mergeCells', 'splitCell'] },
  {
    label: '表头',
    actions: ['toggleHeaderRow', 'toggleHeaderColumn', 'toggleHeaderCell'],
  },
  { label: '表格', actions: ['deleteTable'] },
] as const

const TABLE_TOOLBAR_ACTIONS = TABLE_ACTIONS.filter(
  ({ id }) => id === 'deleteTable',
)

/** 补全用户省略的协议，内部路径和锚点保持原样。 */
function normalizeLinkHref(value: string) {
  const href = value.trim()
  if (!href) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return href

  return `https://${href}`
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

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
  const [linkPopover, setLinkPopover] = useState<LinkPopover | null>(null)
  const [linkInput, setLinkInput] = useState('')
  const [linkTextInput, setLinkTextInput] = useState('')
  const [tablePicker, setTablePicker] = useState<{
    left: number
    top: number
  } | null>(null)
  const [tableHover, setTableHover] = useState({ rows: 3, cols: 3 })
  const [tableMenu, setTableMenu] = useState<{
    left: number
    top: number
  } | null>(null)
  const activeMode = showModeSwitch ? mode : 'markdown'
  const onChangeRef = useRef(onChange)
  const richPanelRef = useRef<HTMLDivElement>(null)
  const referencePanelRef = useRef<HTMLDivElement>(null)
  const emojiPanelRef = useRef<HTMLDivElement>(null)
  const linkPanelRef = useRef<HTMLDivElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const tableButtonRef = useRef<HTMLButtonElement>(null)
  const tablePanelRef = useRef<HTMLDivElement>(null)
  const tableMenuRef = useRef<HTMLDivElement>(null)
  const tableMenuListRef = useRef<HTMLDivElement>(null)
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

  const openLinkPopover = useCallback(
    (
      view: Editor['view'],
      from: number,
      to: number,
      href: string,
      text: string,
      editing: boolean,
    ) => {
      const panel = richPanelRef.current
      if (!panel) return

      const coords = view.coordsAtPos(from)
      const panelRect = panel.getBoundingClientRect()

      // 光标滚出编辑器后不再展示浮窗。
      if (coords.bottom < panelRect.top || coords.top > panelRect.bottom) {
        setLinkPopover(null)
        return
      }

      const above =
        coords.bottom + LINK_POPUP_HEIGHT > window.innerHeight &&
        coords.top - LINK_POPUP_HEIGHT > panelRect.top
      const maxLeft = Math.max(8, panelRect.width - LINK_POPUP_WIDTH - 8)

      setLinkInput(href)
      setLinkTextInput(text)
      setLinkPopover({
        from,
        to,
        left: Math.min(Math.max(coords.left - panelRect.left, 8), maxLeft),
        top: above
          ? coords.top - panelRect.top - 6
          : coords.bottom - panelRect.top + 6,
        above,
        editing,
      })

      requestAnimationFrame(() => linkInputRef.current?.focus())
    },
    [],
  )

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
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: 'https',
        },
      }),
      TableKit.configure({
        table: { resizable: true, lastColumnResizable: true },
      }),
      Image.configure({
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
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
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(
          (file) => file.type.startsWith('image/'),
        )
        if (files.length === 0) return false

        event.preventDefault()

        // 暂时只把图片作为 data URL 插入文档，不做上传。
        void Promise.all(files.map(readImageFileAsDataUrl))
          .then((sources) => {
            const imageType = view.state.schema.nodes.image
            if (!imageType) return

            let tr = view.state.tr
            for (const src of sources) {
              tr = tr.replaceSelectionWith(imageType.create({ src }))
            }
            view.dispatch(tr.scrollIntoView())
          })
          .catch(() => {
            // 无法读取的剪贴板图片直接忽略。
          })

        return true
      },
      handleClick: (view, _pos, event) => {
        const target = event.target as HTMLElement | null
        const anchor = target?.closest('a')

        if (!anchor || !view.dom.contains(anchor)) {
          setLinkPopover(null)
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
      },
      handleDOMEvents: {
        contextmenu: (view, event) => {
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
              (range) =>
                cellPos >= range.$from.pos && cellPos <= range.$to.pos,
            )

          if (!keepCellSelection) {
            const selection = TextSelection.near(
              view.state.doc.resolve(coords.pos),
            )
            view.dispatch(view.state.tr.setSelection(selection))
          }

          const maxLeft = Math.max(8, window.innerWidth - TABLE_MENU_WIDTH - 8)
          const maxHeight = Math.min(
            TABLE_MENU_MAX_HEIGHT,
            window.innerHeight - 16,
          )
          const maxTop = Math.max(8, window.innerHeight - maxHeight - 8)

          setTablePicker(null)
          setLinkPopover(null)
          setTableMenu({
            left: Math.min(Math.max(event.clientX, 8), maxLeft),
            top: Math.min(Math.max(event.clientY, 8), maxTop),
          })

          return true
        },
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
      const focusInPicker = Boolean(
        nextTarget &&
          (referencePanelRef.current?.contains(nextTarget) ||
            emojiPanelRef.current?.contains(nextTarget)),
      )

      if (!focusInPicker) {
        setReferenceTrigger(null)
        emojiSuggestionPropsRef.current = null
        setEmojiSuggestion(null)
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

  // 点击浮窗和编辑器以外的区域时收起链接浮窗。
  useEffect(() => {
    if (!linkPopover) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (linkPanelRef.current?.contains(target)) return
      if (richPanelRef.current?.contains(target)) return

      setLinkPopover(null)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      // 只收起链接浮窗，不要让 Esc 继续关闭外层的编辑器弹窗。
      event.preventDefault()
      event.stopPropagation()
      setLinkPopover(null)
      editor?.view.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, linkPopover])

  // 点击表格大小选择器以外的区域或按 Esc 时收起。
  useEffect(() => {
    if (!tablePicker) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (tablePanelRef.current?.contains(target)) return
      if (tableButtonRef.current?.contains(target)) return

      setTablePicker(null)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      // 只收起表格选择器，不要让 Esc 继续关闭外层的编辑器弹窗。
      event.preventDefault()
      event.stopPropagation()
      setTablePicker(null)
      tableButtonRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [tablePicker])

  // 点击表格右键菜单以外的区域或按 Esc 时收起。
  useEffect(() => {
    if (!tableMenu) return

    function handlePointerDown(event: PointerEvent) {
      if (tableMenuRef.current?.contains(event.target as Node)) return

      setTableMenu(null)
    }

    function handleScroll(event: Event) {
      // 菜单自身滚动时不关闭；页面或编辑器滚动时收起，避免菜单与单元格脱节。
      if (tableMenuRef.current?.contains(event.target as Node)) return
      setTableMenu(null)
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      // 只收起表格菜单，不要让 Esc 继续关闭外层的编辑器弹窗。
      event.preventDefault()
      event.stopPropagation()
      setTableMenu(null)
      editor?.view.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [editor, tableMenu])

  // 右键菜单打开后把焦点交给菜单，支持方向键选择。
  useEffect(() => {
    if (!tableMenu) return

    const frame = requestAnimationFrame(() => tableMenuListRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [tableMenu])

  const editorState = useEditorState({
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

  const headingLabel =
    HEADING_LEVELS[editorState.headingLevel - 1]?.label ?? '正文'

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

  function handleLinkKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (linkInput.trim()) applyLink()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setLinkPopover(null)
    }
  }

  function applyLink() {
    if (!editor || !linkPopover) return

    const href = normalizeLinkHref(linkInput)
    if (!href) return

    // 展示文本留空时直接使用链接内容。
    const text = linkTextInput.trim() || href
    const { from, to } = linkPopover

    let chain = editor.chain().focus().setTextSelection({ from, to })
    if (linkPopover.editing) chain = chain.extendMarkRange('link')

    chain
      .insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href } }],
      })
      .run()
    setLinkPopover(null)
  }

  function removeLink() {
    if (!editor || !linkPopover) return

    const { from, to } = linkPopover
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .extendMarkRange('link')
      .unsetLink()
      .run()
    setLinkPopover(null)
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

    setTableHover({ rows: 3, cols: 3 })
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

  function handleHeadingAction(key: string) {
    if (!editor) return

    if (key === 'paragraph') {
      editor.chain().focus().setParagraph().run()
      return
    }

    editor
      .chain()
      .focus()
      .toggleHeading({ level: Number(key) as 1 | 2 | 3 | 4 | 5 | 6 })
      .run()
  }

  function handleTableAction(key: string) {
    if (!editor) return

    const chain = editor.chain().focus()

    switch (key) {
      case 'insertTable':
        chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
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
    setLinkPopover(null)
    setTablePicker(null)
    setTableMenu(null)
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
          <Dropdown>
            <Dropdown.Trigger
              type="button"
              aria-label="标题级别"
              className={cn(
                'inline-flex h-8 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors hover:bg-default-soft',
                editorState.headingLevel > 0 && 'bg-default text-foreground',
              )}
            >
              <span>{headingLabel}</span>
              <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom start" className="min-w-40">
              <Dropdown.Menu
                aria-label="标题级别"
                onAction={(key) => handleHeadingAction(String(key))}
              >
                {HEADING_LEVELS.map(({ level, label, icon: HeadingIcon }) => (
                  <Dropdown.Item
                    key={level}
                    id={String(level)}
                    textValue={label}
                  >
                    <HeadingIcon className="size-4 text-muted" />
                    <span data-slot="label">{label}</span>
                    {editorState.headingLevel === level ? (
                      <Check className="ml-auto size-4 text-muted" />
                    ) : null}
                  </Dropdown.Item>
                ))}
                <Dropdown.Item id="paragraph" textValue="正文">
                  <span data-slot="label">正文</span>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
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
            label={editorState.isLink ? '编辑链接' : '插入链接'}
            active={editorState.isLink}
            onPress={openLinkFromToolbar}
          >
            <LinkIcon />
          </ToolbarButton>
          {editorState.isInTable ? (
            <Dropdown>
              <Dropdown.Trigger
                type="button"
                aria-label="表格操作"
                className="inline-flex size-8 items-center justify-center rounded-lg bg-default text-foreground transition-colors hover:bg-default-soft"
              >
                <TableIcon className="size-4" />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom start" className="min-w-52">
                <Dropdown.Menu
                  aria-label="表格操作"
                  onAction={(key) => handleTableAction(String(key))}
                >
                  {TABLE_TOOLBAR_ACTIONS.map(({ id, label }) => (
                    <Dropdown.Item
                      key={id}
                      id={id}
                      textValue={label}
                      variant="danger"
                    >
                      <span data-slot="label">{label}</span>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
                <p className="px-2 pt-1 pb-1.5 text-xs text-muted">
                  右键表格可使用更多操作
                </p>
              </Dropdown.Popover>
            </Dropdown>
          ) : (
            <Button
              ref={tableButtonRef}
              type="button"
              size="sm"
              isIconOnly
              variant={tablePicker ? 'secondary' : 'ghost'}
              aria-label="插入表格"
              onPress={toggleTablePicker}
            >
              <TableIcon />
            </Button>
          )}
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
            setTableMenu(null)

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

        {tablePicker ? (
          <Surface
            ref={tablePanelRef}
            className="absolute z-30 w-56 rounded-xl border border-field-border p-2 shadow-lg"
            style={{ left: tablePicker.left, top: tablePicker.top }}
          >
            <p className="px-1 pb-2 text-xs text-muted">
              插入表格 · {tableHover.rows} 行 × {tableHover.cols} 列
            </p>

            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${TABLE_GRID_COLUMNS}, minmax(0, 1fr))`,
              }}
              onMouseLeave={() => setTableHover({ rows: 3, cols: 3 })}
            >
              {Array.from(
                { length: TABLE_GRID_ROWS * TABLE_GRID_COLUMNS },
                (_, index) => {
                  const row = Math.floor(index / TABLE_GRID_COLUMNS) + 1
                  const col = (index % TABLE_GRID_COLUMNS) + 1
                  const active =
                    row <= tableHover.rows && col <= tableHover.cols

                  return (
                    <button
                      key={index}
                      type="button"
                      aria-label={`${row} 行 ${col} 列`}
                      className={cn(
                        'size-5 rounded-[4px] border transition-colors',
                        active
                          ? 'border-foreground/40 bg-default'
                          : 'border-field-border bg-transparent hover:bg-default-soft',
                      )}
                      onFocus={() => setTableHover({ rows: row, cols: col })}
                      onMouseEnter={() => setTableHover({ rows: row, cols: col })}
                      onClick={() => insertTableFromPicker(row, col)}
                    />
                  )
                },
              )}
            </div>
          </Surface>
        ) : null}

        {tableMenu ? (
          <Surface
            ref={tableMenuRef}
            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-field-border p-0 shadow-lg"
            style={{
              left: tableMenu.left,
              top: tableMenu.top,
              maxHeight: `min(${TABLE_MENU_MAX_HEIGHT}px, calc(100vh - 1rem))`,
            }}
          >
            <Menu
              ref={tableMenuListRef}
              aria-label="表格操作"
              className="max-h-[inherit] overflow-y-auto p-1"
              shouldCloseOnSelect={false}
              onAction={(key) => {
                handleTableAction(String(key))
                setTableMenu(null)
              }}
            >
              {TABLE_MENU_GROUPS.map((group, groupIndex) => (
                <MenuSection
                  key={group.label}
                  aria-label={group.label}
                  className={cn(
                    groupIndex > 0 && 'mt-1 border-t border-separator pt-1',
                  )}
                >
                  {group.actions.map((id) => {
                    const action = TABLE_ACTIONS.find((item) => item.id === id)
                    if (!action) return null

                    return (
                      <MenuItem
                        key={id}
                        id={id}
                        textValue={action.label}
                        variant={id === 'deleteTable' ? 'danger' : undefined}
                        isDisabled={
                          (id === 'mergeCells' && !editorState.canMergeCells) ||
                          (id === 'splitCell' && !editorState.canSplitCell)
                        }
                      >
                        <span data-slot="label">{action.label}</span>
                      </MenuItem>
                    )
                  })}
                </MenuSection>
              ))}
            </Menu>
          </Surface>
        ) : null}

        {linkPopover ? (
          <Surface
            ref={linkPanelRef}
            className="absolute z-30 w-80 max-w-[calc(100%_-_1rem)] rounded-xl border border-field-border p-2 shadow-lg"
            style={{
              left: linkPopover.left,
              top: linkPopover.top,
              transform: linkPopover.above ? 'translateY(-100%)' : undefined,
            }}
          >
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="px-1 text-xs text-muted">展示文本</span>
                <Input
                  fullWidth
                  value={linkTextInput}
                  onChange={(event) => setLinkTextInput(event.target.value)}
                  onKeyDown={handleLinkKeyDown}
                  aria-label="展示文本"
                  placeholder="留空则与链接内容相同"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="px-1 text-xs text-muted">
                  链接内容（必填）
                </span>
                <Input
                  ref={linkInputRef}
                  fullWidth
                  value={linkInput}
                  onChange={(event) => setLinkInput(event.target.value)}
                  onKeyDown={handleLinkKeyDown}
                  aria-label="链接内容"
                  placeholder="https://example.com"
                />
              </label>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate px-1 text-xs text-muted">
                {linkPopover.editing ? '编辑链接' : '插入链接'}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                {linkPopover.editing ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onPress={removeLink}
                  >
                    移除
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onPress={() => setLinkPopover(null)}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isDisabled={!linkInput.trim()}
                  onPress={applyLink}
                >
                  确定
                </Button>
              </div>
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
