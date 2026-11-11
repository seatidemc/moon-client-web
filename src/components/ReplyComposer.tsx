import { Button, TextArea } from '@heroui/react'
import { Pin } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useForum } from '@/lib/forum-context'
import { markdownToPlainText } from '@/lib/utils'

interface ReplyComposerProps {
  threadId: string
}

export function ReplyComposer({ threadId }: ReplyComposerProps) {
  const { currentUser, openLogin, createReply } = useForum()
  const [content, setContent] = useState('')
  const [follow, setFollow] = useState(true)
  const [floating, setFloating] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!follow) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => {
      setFloating(!entry.isIntersecting)
    })

    observer.observe(sentinel)

    return () => observer.disconnect()
  }, [follow])

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
    <>
      <div className={follow ? 'sticky bottom-0 z-20 mt-auto' : 'mt-auto'}>
        <div className="mx-auto w-full max-w-3xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="relative">
              <TextArea
                fullWidth
                rows={4}
                aria-label="跟帖内容"
                placeholder="写下你的跟帖…支持 Markdown"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className={`block max-h-56 min-h-28 resize-none rounded-2xl pb-12 [--field-border-hover:var(--field-border)] [--field-hover:var(--color-field)] ${
                  follow && floating ? 'shadow-lg' : 'shadow-none'
                }`}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  isIconOnly
                  variant="ghost"
                  aria-label={follow ? '取消跟随' : '跟随滚动'}
                  aria-pressed={follow}
                  className={follow ? 'text-foreground' : 'text-muted'}
                  onPress={() => setFollow((value) => !value)}
                >
                  <Pin
                    className={`size-4 ${follow ? 'fill-current' : ''}`}
                  />
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="shrink-0"
                  isDisabled={!markdownToPlainText(content)}
                >
                  发布
                </Button>
              </div>
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
      </div>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
    </>
  )
}
