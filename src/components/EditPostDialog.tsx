import {
  Button,
  cn,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { EditorExpandToggle } from '@/components/EditorExpandToggle'
import { RichTextEditor } from '@/components/editor'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { hasRichTextContent } from '@/lib/html-content'
import type { ReplyReferenceOption } from '@/lib/reply-reference-options'

interface EditPostDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  initialTitle?: string
  initialContent: string
  onSave: (values: { title: string; content: string }) => void
  /** 编辑跟帖时用于 re# 楼层提示 */
  floorOptions?: ReplyReferenceOption[]
  /** 所属板块色，用于让编辑弹窗沿用板块主题色 */
  boardColor?: string
}

export function EditPostDialog({
  isOpen,
  onOpenChange,
  initialTitle,
  initialContent,
  onSave,
  floorOptions,
  boardColor,
}: EditPostDialogProps) {
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [wasOpen, setWasOpen] = useState(isOpen)

  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen) setIsAdvanced(false)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size={isAdvanced ? 'full' : 'lg'}>
          <Modal.Dialog style={getBoardThemeStyle(boardColor)}>
            <EditorExpandToggle
              expanded={isAdvanced}
              onToggle={() => setIsAdvanced((current) => !current)}
            />
            <Modal.CloseTrigger aria-label="关闭编辑窗口" />
            <EditPostForm
              key={isOpen ? 'open' : 'closed'}
              initialTitle={initialTitle}
              initialContent={initialContent}
              isAdvanced={isAdvanced}
              floorOptions={floorOptions}
              onCancel={() => onOpenChange(false)}
              onSave={onSave}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function EditPostForm({
  initialTitle,
  initialContent,
  isAdvanced,
  floorOptions,
  onCancel,
  onSave,
}: {
  initialTitle?: string
  initialContent: string
  isAdvanced: boolean
  floorOptions?: ReplyReferenceOption[]
  onCancel: () => void
  onSave: (values: { title: string; content: string }) => void
}) {
  const isThread = initialTitle !== undefined
  const [title, setTitle] = useState(initialTitle ?? '')
  const [content, setContent] = useState(initialContent)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextTitleError = isThread && !title.trim() ? '请填写标题。' : null
    const nextContentError = hasRichTextContent(content) ? null : '请填写正文。'

    setTitleError(nextTitleError)
    setContentError(nextContentError)

    if (nextTitleError || nextContentError) return

    onSave({ title: title.trim(), content })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        isAdvanced && 'mx-auto w-full max-w-3xl',
      )}
    >
      <Modal.Header>
        <Modal.Heading>{isThread ? '编辑主题' : '编辑回复'}</Modal.Heading>
      </Modal.Header>

      <Modal.Body
        className={cn('space-y-4', isAdvanced && 'flex min-h-0 flex-1 flex-col')}
      >
        {isThread ? (
          <TextField
            fullWidth
            isRequired
            isInvalid={Boolean(titleError)}
            className="text-left"
          >
            <Label>标题</Label>
            <Input
              autoFocus
              maxLength={120}
              placeholder="用一句话说清楚主题"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                if (titleError) setTitleError(null)
              }}
            />
            <FieldError>{titleError}</FieldError>
          </TextField>
        ) : null}

        <div className={cn(isAdvanced && 'flex min-h-0 flex-1 flex-col')}>
          <RichTextEditor
            value={content}
            onChange={(nextContent) => {
              setContent(nextContent)
              if (contentError) setContentError(null)
            }}
            fillHeight={isAdvanced}
            advanced={isAdvanced}
            showLabel={isThread}
            floorOptions={floorOptions}
          />
          {contentError ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {contentError}
            </p>
          ) : null}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="tertiary" onPress={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          保存
        </Button>
      </Modal.Footer>
    </form>
  )
}