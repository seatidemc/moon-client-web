import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button, cn, Tabs, TextArea } from '@heroui/react'
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
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { MarkdownShortcuts } from '@/lib/tiptap-markdown-shortcuts'

type EditorMode = 'rich' | 'markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('rich')
  const onChangeRef = useRef(onChange)

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
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'moon-editor-content',
        'aria-label': '正文',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current(currentEditor.getMarkdown())
    },
  })

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

  function switchMode(nextMode: EditorMode) {
    if (nextMode === mode) return

    if (nextMode === 'markdown') {
      onChange(editor?.getMarkdown() ?? value)
    } else if (editor) {
      editor.commands.setContent(value, { contentType: 'markdown' })
    }

    setMode(nextMode)
  }

  function run(command: () => void) {
    command()
  }

  return (
    <Tabs
      selectedKey={mode}
      onSelectionChange={(key) => switchMode(key as EditorMode)}
      className="block"
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium">正文</span>
        <Tabs.ListContainer className="rounded-lg border border-border bg-surface p-0.5">
          <Tabs.List aria-label="编辑模式" className="gap-0 p-0">
            <Tabs.Tab
              id="rich"
              className="h-7 rounded-md px-2.5 text-xs data-[selected=true]:bg-default data-[selected=true]:text-foreground"
            >
              富文本
            </Tabs.Tab>
            <Tabs.Tab
              id="markdown"
              className="h-7 rounded-md px-2.5 text-xs data-[selected=true]:bg-default data-[selected=true]:text-foreground"
            >
              Markdown
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </div>

      <Tabs.Panel id="rich" shouldForceMount className="mt-0 p-0">
        <div
          className={cn(
            'overflow-hidden rounded-xl border border-border bg-surface',
            'transition-colors focus-within:border-accent',
          )}
        >
          <div
            className="flex flex-wrap items-center gap-0.5 border-b border-separator bg-surface-secondary px-2 py-1.5"
            role="toolbar"
            aria-label="格式工具栏"
          >
            <ToolbarButton
              label="粗体"
              active={editorState.isBold}
              onPress={() =>
                run(() => editor?.chain().focus().toggleBold().run())
              }
            >
              <Bold />
            </ToolbarButton>
            <ToolbarButton
              label="斜体"
              active={editorState.isItalic}
              onPress={() =>
                run(() => editor?.chain().focus().toggleItalic().run())
              }
            >
              <Italic />
            </ToolbarButton>
            <ToolbarButton
              label="删除线"
              active={editorState.isStrike}
              onPress={() =>
                run(() => editor?.chain().focus().toggleStrike().run())
              }
            >
              <Strikethrough />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-separator" aria-hidden="true" />
            <ToolbarButton
              label="二级标题"
              active={editorState.isHeading}
              onPress={() =>
                run(() =>
                  editor?.chain().focus().toggleHeading({ level: 2 }).run(),
                )
              }
            >
              <Heading2 />
            </ToolbarButton>
            <ToolbarButton
              label="无序列表"
              active={editorState.isBulletList}
              onPress={() =>
                run(() => editor?.chain().focus().toggleBulletList().run())
              }
            >
              <List />
            </ToolbarButton>
            <ToolbarButton
              label="有序列表"
              active={editorState.isOrderedList}
              onPress={() =>
                run(() => editor?.chain().focus().toggleOrderedList().run())
              }
            >
              <ListOrdered />
            </ToolbarButton>
            <ToolbarButton
              label="引用"
              active={editorState.isBlockquote}
              onPress={() =>
                run(() => editor?.chain().focus().toggleBlockquote().run())
              }
            >
              <Quote />
            </ToolbarButton>
            <ToolbarButton
              label="行内代码"
              active={editorState.isCode}
              onPress={() =>
                run(() => editor?.chain().focus().toggleCode().run())
              }
            >
              <Code />
            </ToolbarButton>
            <ToolbarButton
              label="代码块"
              active={editorState.isCodeBlock}
              onPress={() =>
                run(() => editor?.chain().focus().toggleCodeBlock().run())
              }
            >
              <Code2 />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-separator" aria-hidden="true" />
            <ToolbarButton
              label="撤销"
              disabled={!editorState.canUndo}
              onPress={() => run(() => editor?.chain().focus().undo().run())}
            >
              <Undo2 />
            </ToolbarButton>
            <ToolbarButton
              label="重做"
              disabled={!editorState.canRedo}
              onPress={() => run(() => editor?.chain().focus().redo().run())}
            >
              <Redo2 />
            </ToolbarButton>
          </div>
          <EditorContent editor={editor} />
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="markdown" shouldForceMount className="mt-0 p-0">
        <TextArea
          fullWidth
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Markdown 正文"
          placeholder="用 Markdown 写下正文…"
          className="min-h-64 resize-y font-mono text-sm leading-6"
        />
      </Tabs.Panel>

      <p className="mt-2 text-xs leading-5 text-muted">
        {mode === 'rich'
          ? '可直接输入 Markdown 快捷语法，例如 # 标题、**粗体**、- 列表。'
          : '支持 Markdown 与 GFM 语法。'}{' '}
        正文中的 <span className="whitespace-nowrap">#标签</span>{' '}
        会自动成为帖子标签。
      </p>
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
      variant="ghost"
      aria-label={label}
      isDisabled={disabled}
      onPress={onPress}
      className={cn(
        'size-8 min-w-8 text-muted',
        active && 'bg-default text-foreground',
      )}
    >
      {children}
    </Button>
  )
}
