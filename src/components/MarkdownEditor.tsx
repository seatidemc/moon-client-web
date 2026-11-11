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
  defaultMode?: EditorMode
  showModeSwitch?: boolean
  fillHeight?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  defaultMode = 'rich',
  showModeSwitch = true,
  fillHeight = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>(defaultMode)
  const [prevShowModeSwitch, setPrevShowModeSwitch] = useState(showModeSwitch)
  const activeMode = showModeSwitch ? mode : 'markdown'
  const onChangeRef = useRef(onChange)

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
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'moon-editor-content flex-1',
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
        {showModeSwitch ? (
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
        ) : null}
      </div>

      <Tabs.Panel
        id="rich"
        className={cn(
          'mt-0 flex flex-col p-0',
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-field border border-field-border bg-field shadow-field transition duration-150 hover:border-field-border-hover focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field">
          <EditorContent editor={editor} className="flex flex-1 flex-col" />
        </div>
      </Tabs.Panel>

      <Tabs.Panel
        id="markdown"
        className={cn(
          'mt-0 p-0',
          fillHeight ? 'flex min-h-48 flex-1 flex-col' : 'h-[calc(20rem+2px)]',
        )}
      >
        <TextArea
          fullWidth
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Markdown 正文"
          placeholder="用 Markdown 写下正文…"
          className="block h-full resize-none font-mono text-sm leading-6"
        />
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
