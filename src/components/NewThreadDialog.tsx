import { Button, Input, Modal } from '@heroui/react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { MarkdownEditor } from '@/components/MarkdownEditor'
import { useForum } from '@/lib/forum-context'
import { markdownToPlainText } from '@/lib/utils'

interface NewThreadDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export function NewThreadDialog({ isOpen, onOpenChange }: NewThreadDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭发帖窗口" />
            <NewThreadForm
              key={isOpen ? 'open' : 'closed'}
              onClose={() => onOpenChange(false)}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function NewThreadForm({ onClose }: { onClose: () => void }) {
  const { boards, createThread } = useForum()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('请填写标题。')
      return
    }

    if (!markdownToPlainText(content)) {
      setError('请填写正文。')
      return
    }

    const thread = createThread({ boardId: boards[0]?.id ?? '', title, content })
    if (!thread) {
      setError('登录后才能发帖。')
      return
    }

    onClose()
    navigate(`/thread/${thread.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <Modal.Header>
        <Modal.Heading>发布帖子</Modal.Heading>
      </Modal.Header>

      <Modal.Body className="space-y-4">
        <Input
          id="new-thread-title"
          fullWidth
          autoFocus
          maxLength={120}
          aria-label="标题"
          placeholder="用一句话说清楚主题"
          className="text-lg"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <MarkdownEditor value={content} onChange={setContent} />

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
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
