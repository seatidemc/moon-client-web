import { Button, Kbd, Modal } from '@heroui/react'
import { CornerDownLeft, Maximize2, Pin } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type Ref,
} from 'react'

import { EditorExpandToggle } from '@/components/EditorExpandToggle'
import { COMPACT_EDITOR_LINE_HEIGHT } from '@/components/editor/editor-constants'
import {
  RichTextEditor,
  type RichTextEditorHandle,
} from '@/components/editor'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import { hasRichTextContent } from '@/lib/html-content'
import { buildReplyReferenceOptions } from '@/lib/reply-reference-options'

export interface ReplyComposerHandle {
  /** 在跟帖末尾追加楼层引用 chip，并聚焦输入框 */
  appendReplyReference: (floor: number) => void
}

interface ReplyComposerProps {
  threadId: string
  ref?: Ref<ReplyComposerHandle>
}

export function ReplyComposer({ threadId, ref }: ReplyComposerProps) {
  const {
    boards,
    currentUser,
    openLogin,
    createReply,
    users,
    threads,
    replies,
  } = useForum()
  const thread = threads.find((item) => item.id === threadId)
  const boardColor = thread
    ? boards.find((board) => board.id === thread.boardId)?.color
    : undefined
  const themeStyle = getBoardThemeStyle(boardColor)
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
  const [quickSend, setQuickSend] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<RichTextEditorHandle>(null)

  useImperativeHandle(
    ref,
    () => ({
      appendReplyReference(floor) {
        editorRef.current?.appendReplyReference(floor)
      },
    }),
    [],
  )

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

    if (!hasRichTextContent(content)) return

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
      <div
        className={follow ? 'sticky bottom-0 z-20 mt-auto' : 'mt-auto'}
        style={themeStyle}
      >
        <div className="mx-auto w-full max-w-[69.25rem] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {currentUser ? (
            <form onSubmit={handleSubmit} className="max-w-3xl">
              <div
                className={`flex flex-col rounded-2xl border border-field-border bg-field transition duration-150 focus-within:border-field-border-focus focus-within:bg-field-focus focus-within:status-focused-field ${
                  follow && floating ? 'shadow-lg' : 'shadow-none'
                }`}
              >
                <RichTextEditor
                  ref={editorRef}
                  compact
                  value={content}
                  onChange={setContent}
                  ariaLabel="跟帖内容"
                  syncExternalValue={!expanded}
                  floorOptions={floorOptions}
                  onQuickSendChange={setQuickSend}
                />
                <div
                  className={`flex items-center justify-end gap-1 transition-[height,margin] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
                    quickSend ? 'pointer-events-none pr-1.5' : 'px-2 py-2'
                  }`}
                  style={
                    quickSend
                      ? {
                          height: COMPACT_EDITOR_LINE_HEIGHT,
                          marginTop: -COMPACT_EDITOR_LINE_HEIGHT,
                        }
                      : undefined
                  }
                >
                  <div
                    inert={quickSend}
                    className={`grid shrink-0 transition-[grid-template-columns,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
                      quickSend
                        ? 'grid-cols-[0fr] opacity-0'
                        : 'grid-cols-[1fr] opacity-100'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                      <Button
                        type="button"
                        size="sm"
                        isIconOnly
                        variant="ghost"
                        aria-label="高级编辑"
                        className="shrink-0 text-muted"
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
                        className={`shrink-0 ${follow ? 'text-foreground' : 'text-muted'}`}
                        onPress={() => setFollow((value) => !value)}
                      >
                        <Pin
                          className={`size-4 ${follow ? 'fill-current' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    className="pointer-events-auto shrink-0"
                    isDisabled={!hasRichTextContent(content)}
                  >
                    发布
                    {quickSend ? (
                      <Kbd
                        aria-hidden="true"
                        className="size-5 justify-center bg-current/20 p-0 text-current"
                      >
                        <CornerDownLeft className="size-3" />
                      </Kbd>
                    ) : null}
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
            <Modal.Dialog style={themeStyle}>
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
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    fillHeight
                    ariaLabel="跟帖内容"
                    showLabel={false}
                    syncExternalValue={expanded}
                    floorOptions={floorOptions}
                  />
                </Modal.Body>

                <Modal.Footer>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={!hasRichTextContent(content)}
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