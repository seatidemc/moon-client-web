import { Button, Input } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { MarkdownEditor } from '@/components/MarkdownEditor'
import { useForum } from '@/lib/forum-context'
import { markdownToPlainText } from '@/lib/utils'
import type { ForumThread } from '@/types'

interface ThreadComposerProps {
  boardId: string
  onPublished: (thread: ForumThread) => void
  onCancel: () => void
}

export function ThreadComposer({
  boardId,
  onPublished,
  onCancel,
}: ThreadComposerProps) {
  const { createThread, openLogin } = useForum()
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

    const thread = createThread({ boardId, title, content })
    if (!thread) {
      openLogin()
      return
    }

    onPublished(thread)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-4 sm:p-5"
    >
      <h2 className="text-base font-medium">发帖</h2>

      <div className="mt-4 space-y-1.5">
        <label htmlFor="thread-title" className="text-sm font-medium">
          标题
        </label>
        <Input
          id="thread-title"
          fullWidth
          autoFocus
          maxLength={120}
          placeholder="用一句话说清楚主题"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="mt-4">
        <MarkdownEditor value={content} onChange={setContent} />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="tertiary" onPress={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          发布主题
        </Button>
      </div>
    </form>
  )
}
