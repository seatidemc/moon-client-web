import { Button, Kbd, Modal } from '@heroui/react'
import { CornerDownLeft, Maximize2, Pin } from 'lucide-react'
import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
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
import { PAGE_SIZE } from '@/lib/constants'
import { useForum } from '@/lib/forum-context'
import { hasRichTextContent } from '@/lib/html-content'
import { pulseElement } from '@/lib/pulse'
import {
  flattenPages,
  useCreateReply,
  useThread,
  useThreadReplies,
} from '@/lib/queries'
import { buildReplyReferenceOptions } from '@/lib/reply-reference-options'
import { scrollIntoViewAbove } from '@/lib/scroll'
import type { Reply } from '@/types'

export interface ReplyComposerHandle {
  /** 在跟帖末尾追加楼层引用 chip，并聚焦输入框 */
  appendReplyReference: (floor: number) => void
}

interface ReplyComposerProps {
  threadId: number
  ref?: Ref<ReplyComposerHandle>
}

export function ReplyComposer({ threadId, ref }: ReplyComposerProps) {
  const { currentUser, openLogin } = useForum()
  const threadQuery = useThread(threadId)
  const repliesQuery = useThreadReplies(threadId)
  const createReply = useCreateReply(threadId)

  const thread = threadQuery.data
  const replies = flattenPages(repliesQuery.data)
  const boardColor = thread?.board.color
  const themeStyle = getBoardThemeStyle(boardColor)
  const floorOptions = thread
    ? buildReplyReferenceOptions(
        thread,
        [...replies].sort((a, b) => a.floor - b.floor),
      )
    : []

  const [content, setContent] = useState('')
  const [follow, setFollow] = useState(true)
  const [floating, setFloating] = useState(false)
  const [quickSend, setQuickSend] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [pendingReplyId, setPendingReplyId] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const replyAreaRef = useRef<HTMLDivElement>(null)
  const stickyBarRef = useRef<HTMLDivElement>(null)
  const scrolledReplyRef = useRef<number | null>(null)
  const editorRef = useRef<RichTextEditorHandle>(null)

  useImperativeHandle(
    ref,
    () => ({
      appendReplyReference(floor) {
        const appended = editorRef.current?.appendReplyReference(floor)

        // 已经在回复该楼层：不再重复插入引用，改为强调输入区。
        if (appended !== false || expanded) return

        const area = replyAreaRef.current
        if (area) pulseElement(area)
      },
    }),
    [expanded],
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

  // 新楼层渲染进列表后平滑滚到它；用 layout effect 让滚动在新内容绘制前
  // 就开始，避免先闪一帧停在原位。刚发布的这条不做入场动画：平滑滚动要
  // 走一段路，挂载时的动画只会在视野外播完，没有意义。
  useLayoutEffect(() => {
    if (pendingReplyId === null || scrolledReplyRef.current === pendingReplyId) {
      return
    }

    const element = document.getElementById(`reply-${pendingReplyId}`)
    if (!element) return

    scrolledReplyRef.current = pendingReplyId
    element.classList.remove('moon-reveal')
    scrollIntoViewAbove(element, stickyBarRef.current)
  }, [pendingReplyId, replies])

  async function submitReply() {
    if (!currentUser) {
      openLogin()
      return
    }

    if (!hasRichTextContent(content)) return

    try {
      const reply = await createReply.mutateAsync(content)
      setContent('')
      setExpanded(false)
      await loadReplyPage(reply)
      // 等新楼层随列表刷新渲染出来再滚动，落点按最新布局计算。
      setPendingReplyId(reply.id)
    } catch {
      // 错误信息已由全局处理展示；保留输入内容方便重试。
    }
  }

  /**
   * 新楼层排在最后一页。用户还没滑到那里时该页尚未加载，列表里就不会
   * 出现这条回复；这里把它所在的分页补齐，后续的滚动才有目标可去。
   */
  async function loadReplyPage(reply: Reply) {
    const replyPage = Math.ceil(reply.floor / PAGE_SIZE)
    let loadedPages = repliesQuery.data?.pages.length ?? 0

    try {
      while (loadedPages < replyPage) {
        const result = await repliesQuery.fetchNextPage()
        const nextLoaded = result.data?.pages.length ?? 0
        if (nextLoaded <= loadedPages) break
        loadedPages = nextLoaded
        if (!result.hasNextPage) break
      }
    } catch {
      // 分页加载失败不影响发布结果，回复会在下次加载该页时出现。
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitReply()
  }

  return (
    <>
      <div
        ref={stickyBarRef}
        className={`pointer-events-none ${follow ? 'sticky bottom-0 z-20 mt-auto' : 'mt-auto'}`}
        style={themeStyle}
      >
        {/*
         * 和主题页正文使用同一套网格，让输入框宽度始终跟随正文列：
         * 屏幕在 lg 与容器最大宽度之间时正文列会收窄，输入框若固定
         * max-w-3xl 就会溢出到右侧目录上方。外层还设为
         * pointer-events-none，避免透明的栏体拦住目录横线的点击。
         */}
        <div className="mx-auto w-full max-w-[69.25rem] px-4 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[minmax(0,48rem)_18rem] lg:gap-5">
          {thread?.locked ? (
            <div
              className={`pointer-events-auto min-w-0 rounded-2xl border border-field-border bg-field px-3 py-2 text-sm text-muted transition duration-150 ${
                follow && floating ? 'shadow-lg' : 'shadow-none'
              }`}
            >
              主题已锁定，无法回复
            </div>
          ) : currentUser ? (
            <form
              onSubmit={handleSubmit}
              className="pointer-events-auto min-w-0"
            >
              <div
                ref={replyAreaRef}
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
                    isDisabled={
                      createReply.isPending || !hasRichTextContent(content)
                    }
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
            /*
             * 未登录时没有编辑器撑起整块浮层，但同样需要不透明卡片：否则
             * 上一条回复的点赞、回复按钮会从提示文字背后透出来。
             */
            <div
              className={`pointer-events-auto flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-field-border bg-field px-3 py-2 transition duration-150 ${
                follow && floating ? 'shadow-lg' : 'shadow-none'
              }`}
            >
              <p className="text-sm text-muted">登录后参与讨论。</p>
              <Button
                type="button"
                size="sm"
                variant="primary"
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
                    syncExternalValue={expanded}
                    floorOptions={floorOptions}
                  />
                </Modal.Body>

                <Modal.Footer>
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={
                      createReply.isPending || !hasRichTextContent(content)
                    }
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