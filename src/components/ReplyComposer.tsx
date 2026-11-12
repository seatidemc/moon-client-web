import { Button, Modal, TextArea } from '@heroui/react'
import { Maximize2, Pin } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from 'react'

import { EditorExpandToggle } from '@/components/EditorExpandToggle'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import { useForum } from '@/lib/forum-context'
import { buildReplyReferenceOptions } from '@/lib/reply-reference-options'
import { markdownToPlainText } from '@/lib/utils'

export interface ReplyComposerHandle {
  /** 在跟帖末尾追加 re#楼层号，并聚焦输入框 */
  appendReplyReference: (reference: string) => void
}

interface ReplyComposerProps {
  threadId: string
  ref?: Ref<ReplyComposerHandle>
}

export function ReplyComposer({ threadId, ref }: ReplyComposerProps) {
  const { currentUser, openLogin, createReply, users, threads, replies } =
    useForum()
  const thread = threads.find((item) => item.id === threadId)
  const floorOptions = thread
    ? buildReplyReferenceOptions(
        thread,
        replies
          .filter((reply) => reply.threadId === thread.id)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        users,
      )
    : []
  const [content, setContent] = useState('')
  const [follow, setFollow] = useState(true)
  const [floating, setFloating] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      appendReplyReference(reference) {
        setContent((previous) => {
          const separator =
            previous === '' || /\s$/.test(previous) ? '' : ' '

          return `${previous}${separator}${reference} `
        })

        requestAnimationFrame(() => {
          const textarea = textareaRef.current
          if (!textarea) return

          textarea.focus()
          textarea.setSelectionRange(
            textarea.value.length,
            textarea.value.length,
          )
        })
      },
    }),
    [],
  )

  // Let the textarea grow with its content up to its max height; past that it
  // scrolls internally, which keeps the caret in view above the action bar.
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
        <div className="mx-auto w-full max-w-[57.25rem] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="max-w-3xl">
              <div
                className={`flex flex-col overflow-hidden rounded-2xl border border-field-border bg-field transition duration-150 focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field ${
                  follow && floating ? 'shadow-lg' : 'shadow-none'
                }`}
              >
                <TextArea
                  ref={textareaRef}
                  fullWidth
                  rows={4}
                  aria-label="跟帖内容"
                  placeholder="写下你的跟帖…支持 Markdown，re#楼层号 可引用楼层"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="block max-h-44 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 pt-3 pb-2 shadow-none outline-none hover:bg-transparent focus:border-0 focus:bg-transparent focus:shadow-none focus:ring-0"
                />
                <div className="flex shrink-0 items-center justify-end gap-1 px-2 py-2">
                  <Button
                    type="button"
                    size="sm"
                    isIconOnly
                    variant="ghost"
                    aria-label="高级编辑"
                    className="text-muted"
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
                    <Pin className={`size-4 ${follow ? 'fill-current' : ''}`} />
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
                    floorOptions={floorOptions}
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