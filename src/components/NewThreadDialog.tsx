import {
  Button,
  cn,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
} from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { EditorExpandToggle } from '@/components/EditorExpandToggle'
import { RichTextEditor } from '@/components/editor'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import { hasRichTextContent } from '@/lib/html-content'

interface NewThreadDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** 固定发帖板块；设置后隐藏板块选择 */
  boardId?: string
}

export function NewThreadDialog({
  isOpen,
  onOpenChange,
  boardId,
}: NewThreadDialogProps) {
  const { boards } = useForum()
  const [isAdvanced, setIsAdvanced] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [wasOpen, setWasOpen] = useState(isOpen)

  if (wasOpen !== isOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setIsAdvanced(false)
      setFormKey((key) => key + 1)
    }
  }

  // 固定板块时，用板块色作为整个弹窗的主题色
  const boardColor = boardId
    ? boards.find((board) => board.id === boardId)?.color
    : undefined
  const themeStyle = getBoardThemeStyle(boardColor)

  function closeDialog() {
    onOpenChange(false)
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size={isAdvanced ? 'full' : 'lg'}>
          <Modal.Dialog style={themeStyle}>
            <EditorExpandToggle
              expanded={isAdvanced}
              onToggle={() => setIsAdvanced((current) => !current)}
            />
            <Modal.CloseTrigger aria-label="关闭发帖窗口" />
            <NewThreadForm
              key={formKey}
              boardId={boardId}
              isAdvanced={isAdvanced}
              onClose={closeDialog}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function NewThreadForm({
  boardId,
  isAdvanced,
  onClose,
}: {
  boardId?: string
  isAdvanced: boolean
  onClose: () => void
}) {
  const { boards, createThread } = useForum()
  const navigate = useNavigate()
  const [selectedBoardId, setSelectedBoardId] = useState(
    () => boardId ?? boards[0]?.id ?? '',
  )
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextTitleError = title.trim() ? null : '请填写标题。'
    const nextContentError = hasRichTextContent(content) ? null : '请填写正文。'

    setTitleError(nextTitleError)
    setContentError(nextContentError)
    setSubmitError(null)

    if (nextTitleError || nextContentError) return

    const thread = createThread({
      boardId: selectedBoardId,
      title,
      content,
    })
    if (!thread) {
      setSubmitError('登录后才能发帖。')
      return
    }

    onClose()
    navigate(`/thread/${thread.id}`)
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
        <Modal.Heading>发布帖子</Modal.Heading>
      </Modal.Header>

      <Modal.Body
        className={cn('space-y-4', isAdvanced && 'flex min-h-0 flex-1 flex-col')}
      >
        <TextField
          fullWidth
          isRequired
          isInvalid={Boolean(titleError)}
          className="text-left"
        >
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

        <div className={cn(isAdvanced && 'flex min-h-0 flex-1 flex-col')}>
          <RichTextEditor
            value={content}
            onChange={(nextContent) => {
              setContent(nextContent)
              if (contentError) setContentError(null)
            }}
            fillHeight={isAdvanced}
            advanced={isAdvanced}
          />
          {contentError ? (
            <p className="mt-1 text-xs text-danger" role="alert">
              {contentError}
            </p>
          ) : null}
        </div>

        {boardId ? null : (
          <Select
            fullWidth
            selectedKey={selectedBoardId || null}
            onSelectionChange={(key) =>
              setSelectedBoardId(key === null ? '' : String(key))
            }
            className="text-left"
          >
            <Label>板块</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {boards.map((board) => (
                  <ListBox.Item
                    key={board.id}
                    id={board.id}
                    textValue={board.name}
                  >
                    {board.name}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        {submitError ? (
          <p className="text-sm text-danger" role="alert">
            {submitError}
          </p>
        ) : null}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="tertiary" onPress={onClose}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          发布帖子
        </Button>
      </Modal.Footer>
    </form>
  )
}
