import type { Editor } from '@tiptap/core'
import { Button, Dropdown, cn } from '@heroui/react'
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Code2,
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
import type { ReactNode, RefObject } from 'react'

import { applyHeading, applyTableAction } from './editor-commands'
import {
  HEADING_LEVELS,
  TABLE_TOOLBAR_ACTIONS,
  type TableActionId,
} from './editor-constants'
import { DocumentFileMenu } from './DocumentFileMenu'
import type { EditorToolbarState } from './editor-types'

interface EditorToolbarProps {
  editor: Editor | null
  state: EditorToolbarState
  tableButtonRef: RefObject<HTMLButtonElement | null>
  tablePickerOpen: boolean
  onToggleTablePicker: () => void
  onOpenLink: () => void
  onImportMarkdown: (markdown: string) => void
  onExportMarkdown: () => void
  onExportHtml: () => void
  /** 未展开时只保留最基础的格式：粗体、斜体、删除线 */
  minimal?: boolean
  className?: string
}

export function EditorToolbar({
  editor,
  state,
  tableButtonRef,
  tablePickerOpen,
  onToggleTablePicker,
  onOpenLink,
  onImportMarkdown,
  onExportMarkdown,
  onExportHtml,
  minimal = false,
  className,
}: EditorToolbarProps) {
  const headingLabel =
    HEADING_LEVELS[state.headingLevel - 1]?.label ?? '正文'

  const basicButtons = (
    <>
      <ToolbarButton
        label="粗体"
        active={state.isBold}
        onPress={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="斜体"
        active={state.isItalic}
        onPress={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="删除线"
        active={state.isStrike}
        onPress={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
    </>
  )

  if (minimal) {
    return (
      <div
        role="toolbar"
        aria-label="格式工具栏"
        className={cn(
          'flex shrink-0 flex-wrap items-center gap-0.5',
          className,
        )}
      >
        {basicButtons}
      </div>
    )
  }

  return (
    <div
      role="toolbar"
      aria-label="格式工具栏"
      className="mb-2 flex shrink-0 flex-wrap items-center gap-0.5"
    >
      {basicButtons}

      <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />

      <Dropdown>
        <Dropdown.Trigger
          type="button"
          aria-label="标题级别"
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors hover:bg-default-soft',
            state.headingLevel > 0 && 'bg-default text-foreground',
          )}
        >
          <span>{headingLabel}</span>
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start" className="min-w-40">
          <Dropdown.Menu
            aria-label="标题级别"
            onAction={(key) => {
              if (editor) applyHeading(editor, String(key))
            }}
          >
            {HEADING_LEVELS.map(({ level, label, icon: HeadingIcon }) => (
              <Dropdown.Item
                key={level}
                id={String(level)}
                textValue={label}
              >
                <HeadingIcon className="size-4 text-muted" />
                <span data-slot="label">{label}</span>
                {state.headingLevel === level ? (
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
        active={state.isBulletList}
        onPress={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="有序列表"
        active={state.isOrderedList}
        onPress={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="引用"
        active={state.isBlockquote}
        onPress={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        label="行内代码"
        active={state.isCode}
        onPress={() => editor?.chain().focus().toggleCode().run()}
      >
        <Code />
      </ToolbarButton>
      <ToolbarButton
        label="代码块"
        active={state.isCodeBlock}
        onPress={() => editor?.chain().focus().toggleCodeBlock().run()}
      >
        <Code2 />
      </ToolbarButton>

      <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />

      <ToolbarButton
        label={state.isLink ? '编辑链接' : '插入链接'}
        active={state.isLink}
        onPress={onOpenLink}
      >
        <LinkIcon />
      </ToolbarButton>

      {state.isInTable ? (
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
              onAction={(key) => {
                if (editor) {
                  applyTableAction(editor, key as TableActionId)
                }
              }}
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
          variant={tablePickerOpen ? 'secondary' : 'ghost'}
          aria-label="插入表格"
          onPress={onToggleTablePicker}
        >
          <TableIcon />
        </Button>
      )}

      <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />

      <ToolbarButton
        label="撤销"
        disabled={!state.canUndo}
        onPress={() => editor?.chain().focus().undo().run()}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        label="重做"
        disabled={!state.canRedo}
        onPress={() => editor?.chain().focus().redo().run()}
      >
        <Redo2 />
      </ToolbarButton>

      <span className="mx-0.5 h-5 w-px bg-separator" aria-hidden="true" />

      <DocumentFileMenu
        onImportMarkdown={onImportMarkdown}
        onExportMarkdown={onExportMarkdown}
        onExportHtml={onExportHtml}
      />
    </div>
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