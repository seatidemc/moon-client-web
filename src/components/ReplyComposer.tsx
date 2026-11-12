import { Button, Modal, TextArea } from '@heroui/react'
import { Maximize2, Pin } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { EditorExpandToggle } from '@/components/EditorExpandToggle'
import { MarkdownEditor } from '@/components/MarkdownEditor'
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
  const [expanded, setExpanded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Let the textarea grow with its content; the composer box caps the height
  // and scrolls, so the action bar can stick to its bottom edge.
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  useLayoutEffect(() => {
    resizeTextarea()
  }, [content, resizeTextarea])

  useEffect(() => {
    window.addEventListener('resize', resizeTextarea)

    return () => window.removeEventListener('resize', resizeTextarea)
  }, [resizeTextarea])

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

  function submitReply() {
    if (!currentUser) {
      openLogin()
      return
    }

    if (!markdownToPlainText(content)) return

    const reply = createReply({ threadId, content })
    setContent('')
    setExpanded(false)

    if (reply) {
      requestAnimationFrame(() => {
        document
          .getElementById(`reply-${reply.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitReply()
  }

  return (
    <>
      <div className={follow ? 'sticky bottom-0 z-20 mt-auto' : 'mt-auto'}>
        <div className="mx-auto w-full max-w-[69.25rem] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="max-w-3xl">
              <div
                className={`group max-h-56 overflow-y-auto rounded-2xl border border-field-border bg-field transition duration-150 focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field ${
                  follow && floating ? 'shadow-lg' : 'shadow-none'
                }`}
              >
                <TextArea
                  ref={textareaRef}
                  fullWidth
                  rows={4}
                  aria-label="跟帖内容"
                  placeholder="写下你的跟帖…支持 Markdown"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="block resize-none overflow-hidden border-0 bg-transparent px-4 pt-3 pb-2 shadow-none"
                />
                <div className="relative sticky bottom-0 z-10 bg-field pt-1 transition-colors group-focus-within:bg-field-focus">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -top-4 h-4 bg-gradient-to-t from-field to-transparent group-focus-within:from-field-focus"
                  />
                  <div className="flex items-center justify-end gap-1 px-2 pb-2">
                    <Button
                      type="button"
                      size="sm"
                      isIconOnly
                      variant="ghost"
                      aria-label="高级编辑"
                      onPress={() => setExpanded(true)}
                    >
                      <Maximize2 className="size-4" />
                    </Button>
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
                </div>
              </div>
            </form>
          ) : (
            <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3">
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

      <Modal isOpen={expanded} onOpenChange={setExpanded}>
        <Modal.Backdrop>
          <Modal.Container size="full">
            <Modal.Dialog>
              <EditorExpandToggle
                expanded
                onToggle={() => setExpanded(false)}
              />
              <Modal.CloseTrigger aria-label="收起编辑器" />
              <form
                key={expanded ? 'open' : 'closed'}
                onSubmit={handleSubmit}
                className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col"
              >
                <Modal.Header>
                  <Modal.Heading>发布跟帖</Modal.Heading>
                </Modal.Header>

                <Modal.Body className="flex min-h-0 flex-1 flex-col">
                  <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    defaultMode="markdown"
                    fillHeight
                    showModeSwitch
                  />
                </Modal.Body>

                <Modal.Footer>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={!markdownToPlainText(content)}
                  >
                    发布
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}