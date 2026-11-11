import {
  Button,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { MarkdownEditor } from '@/components/MarkdownEditor'
import { markdownToPlainText } from '@/lib/utils'

interface EditPostDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  initialTitle?: string
  initialContent: string
  onSave: (values: { title: string; content: string }) => void
}

export function EditPostDialog({
  isOpen,
  onOpenChange,
  initialTitle,
  initialContent,
  onSave,
}: EditPostDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭编辑窗口" />
            <EditPostForm
              key={isOpen ? 'open' : 'closed'}
              initialTitle={initialTitle}
              initialContent={initialContent}
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
  onCancel,
  onSave,
}: {
  initialTitle?: string
  initialContent: string
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
    const nextContentError = markdownToPlainText(content) ? null : '请填写正文。'

    setTitleError(nextTitleError)
    setContentError(nextContentError)

    if (nextTitleError || nextContentError) return

    onSave({ title: title.trim(), content })
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <Modal.Header>
        <Modal.Heading>{isThread ? '编辑主题' : '编辑回复'}</Modal.Heading>
      </Modal.Header>

      <Modal.Body className="space-y-4">
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

        <div>
          <MarkdownEditor
            value={content}
            onChange={(nextContent) => {
              setContent(nextContent)
              if (contentError) setContentError(null)
            }}
            defaultMode="markdown"
            showModeSwitch={false}
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