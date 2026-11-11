import { Button, TextArea } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { useForum } from '@/lib/forum-context'
import { markdownToPlainText } from '@/lib/utils'

interface ReplyComposerProps {
  threadId: string
}

export function ReplyComposer({ threadId }: ReplyComposerProps) {
  const { currentUser, openLogin, createReply } = useForum()
  const [content, setContent] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentUser) {
      openLogin()
      return
    }

    if (!markdownToPlainText(content)) return

    const reply = createReply({ threadId, content })
    setContent('')

    if (reply) {
      requestAnimationFrame(() => {
        document
          .getElementById(`reply-${reply.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  return (
    <div className="sticky bottom-0 z-20 mt-auto border-t border-border bg-background/95 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <TextArea
            fullWidth
            rows={2}
            aria-label="跟帖内容"
            placeholder="写下你的跟帖…支持 Markdown"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="max-h-40 min-h-16 resize-none"
          />
          <Button
            type="submit"
            variant="primary"
            className="shrink-0"
            isDisabled={!markdownToPlainText(content)}
          >
            发布
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">登录后参与讨论。</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onPress={() => openLogin()}
          >
            登录
          </Button>
        </div>
      )}
    </div>
  )
}
