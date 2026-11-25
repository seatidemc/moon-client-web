import { Button, cn } from '@heroui/react'
import {
  CornerUpLeft,
  Heart,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { BoardIcon } from '@/components/BoardIcon'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EditPostDialog } from '@/components/EditPostDialog'
import { LoadingState } from '@/components/LoadingState'
import { PostContent } from '@/components/PostContent'
import {
  ReplyComposer,
  type ReplyComposerHandle,
} from '@/components/ReplyComposer'
import { ThreadToc } from '@/components/ThreadToc'
import { UserByline } from '@/components/UserByline'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import {
  flattenPages,
  useDeleteReply,
  useDeleteThread,
  useSetReplyLike,
  useSetThreadLike,
  useSetThreadLocked,
  useSetThreadPinned,
  useThread,
  useThreadReplies,
  useUpdateReply,
  useUpdateThread,
} from '@/lib/queries'
import { buildReplyReferenceOptions } from '@/lib/reply-reference-options'
import { getDisplayName } from '@/lib/user'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePageTitle } from '@/lib/use-page-title'
import { formatRelativeTime } from '@/lib/utils'
import type { Reply } from '@/types'
import { NotFoundPage } from '@/pages/NotFoundPage'

type EditTarget = { kind: 'thread' } | { kind: 'reply'; reply: Reply }

interface PostActionsProps {
  liked: boolean
  likeCount: number
  postLabel: string
  onLike: () => void
  onReply: () => void
  replyDisabled?: boolean
  className?: string
}

function PostActions({
  liked,
  likeCount,
  postLabel,
  onLike,
  onReply,
  replyDisabled = false,
  className,
}: PostActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={liked}
        aria-label={liked ? `取消${postLabel}的点赞` : `点赞${postLabel}`}
        className="gap-1.5 px-2 text-xs text-muted hover:text-foreground"
        onPress={onLike}
      >
        <Heart
          aria-hidden="true"
          className={cn('size-4', liked && 'fill-current text-danger')}
        />
        <span className="tabular-nums">{likeCount}</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`回复${postLabel}`}
        isDisabled={replyDisabled}
        className="gap-1.5 px-2 text-xs text-muted hover:text-foreground"
        onPress={onReply}
      >
        <CornerUpLeft aria-hidden="true" className="size-4" />
        回复
      </Button>
    </div>
  )
}

export function ThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const threadId = Number(id)

  const { currentUser, openLogin, hasPermission } = useForum()
  const threadQuery = useThread(threadId)
  const repliesQuery = useThreadReplies(threadId)
  const likeThread = useSetThreadLike(threadId)
  const likeReply = useSetReplyLike(threadId)
  const updateThread = useUpdateThread(threadId)
  const deleteThread = useDeleteThread()
  const deleteReply = useDeleteReply(threadId)
  const pinThread = useSetThreadPinned(threadId)
  const lockThread = useSetThreadLocked(threadId)

  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<Reply | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const composerRef = useRef<ReplyComposerHandle>(null)
  const updateReply = useUpdateReply(
    threadId,
    editTarget?.kind === 'reply' ? editTarget.reply.id : 0,
  )

  const thread = threadQuery.data
  const replies = flattenPages(repliesQuery.data)
  const threadReplies = [...replies].sort((a, b) => a.floor - b.floor)
  const sentinelRef = useInfiniteScroll({
    hasNextPage: repliesQuery.hasNextPage,
    isFetchingNextPage: repliesQuery.isFetchingNextPage,
    fetchNextPage: repliesQuery.fetchNextPage,
  })

  usePageTitle(thread?.title)

  if (!Number.isFinite(threadId) || threadId <= 0 || threadQuery.isError) {
    return <NotFoundPage />
  }

  if (!thread) {
    return (
      <main className="mx-auto w-full max-w-[69.25rem] px-4 py-16">
        <LoadingState label="正在加载主题…" />
      </main>
    )
  }

  const board = thread.board
  const author = thread.author
  const themeStyle = getBoardThemeStyle(board.color)
  const replyReferenceOptions = buildReplyReferenceOptions(
    thread,
    threadReplies,
  )
  const tocItems = [
    { id: 'thread-post', label: '主题', time: thread.createdAt },
    ...threadReplies.map((reply) => ({
      id: `reply-${reply.id}`,
      label: `#${reply.floor} ${
        reply.author ? getDisplayName(reply.author) : '已删除'
      }`,
      time: reply.createdAt,
    })),
  ]
  const edited = thread.updatedAt && thread.updatedAt !== thread.createdAt

  async function handleDeleteThread() {
    try {
      await deleteThread.mutateAsync(thread!.id)
      setDeleteThreadOpen(false)
      navigate(`/topic/${board.slug}`, { replace: true })
    } catch {
      // 错误信息由 API 层展示。
    }
  }

  async function handleDeleteReply() {
    if (!replyToDelete) return

    try {
      await deleteReply.mutateAsync(replyToDelete.id)
      setReplyToDelete(null)
    } catch {
      // 错误信息由 API 层展示。
    }
  }

  function handleReply(floor: number) {
    if (!currentUser) {
      openLogin(() => composerRef.current?.appendReplyReference(floor))
      return
    }

    composerRef.current?.appendReplyReference(floor)
  }

  function handleLikeThread() {
    if (!currentUser) {
      openLogin()
      return
    }

    likeThread.mutate(!thread!.likedByMe)
  }

  function handleLikeReply(reply: Reply) {
    if (!currentUser) {
      openLogin()
      return
    }

    likeReply.mutate({ replyId: reply.id, liked: !reply.likedByMe })
  }

  function handleTogglePin() {
    pinThread.mutate(!thread!.pinned)
  }

  function handleToggleLock() {
    lockThread.mutate(!thread!.locked)
  }

  const canPin = hasPermission('thread.pin', board.id)
  const canLock = hasPermission('thread.lock', board.id)
  const canManageThread =
    thread.canEdit || thread.canDelete || canPin || canLock

  return (
    <div
      className="flex min-h-[calc(100svh-3.5rem)] flex-col"
      style={themeStyle}
    >
      <main className="mx-auto w-full max-w-[69.25rem] flex-1 px-4 pt-10 sm:pt-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,48rem)_18rem]">
          <div className="min-w-0 space-y-5">
            <article
              id="thread-post"
              className="moon-reveal scroll-mt-6 rounded-2xl bg-surface p-4 sm:p-5"
            >
              <Link
                to={`/topic/${board.slug}`}
                className="mb-3 flex w-fit items-center gap-1.5 rounded text-sm text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
              >
                <BoardIcon
                  icon={board.icon}
                  color={board.color}
                  size="16px"
                />
                {board.name}
              </Link>

              <h1 className="break-words font-minecraft-sc text-2xl leading-tight tracking-tight sm:text-3xl">
                {thread.title}
              </h1>

              <div className="mt-5 min-w-0 lg:hidden">
                {author ? (
                  <UserByline
                    user={author}
                    date={thread.createdAt}
                    avatarSize="md"
                    showHandle={false}
                  />
                ) : (
                  <span className="text-sm text-muted">未知用户</span>
                )}
              </div>

              <PostContent className="mt-6" imageLightbox>
                {thread.contentHtml}
              </PostContent>

              <div
                className={cn(
                  'mt-4 flex items-end justify-between gap-3',
                  !canManageThread && 'lg:hidden',
                )}
              >
                <PostActions
                  className="lg:hidden"
                  liked={thread.likedByMe}
                  likeCount={thread.likeCount}
                  postLabel="主题"
                  onLike={handleLikeThread}
                  onReply={() => handleReply(0)}
                  replyDisabled={thread.locked}
                />

                {canManageThread ? (
                  <div className="ml-auto flex items-center">
                    {canPin ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          isIconOnly
                          variant="ghost"
                          className={cn(
                            'text-muted hover:text-foreground',
                            thread.pinned && 'text-accent',
                          )}
                          aria-label={thread.pinned ? '取消置顶' : '置顶主题'}
                          aria-pressed={thread.pinned}
                          onPress={handleTogglePin}
                        >
                          <Pin
                            className={cn(
                              'size-3.5',
                              thread.pinned && 'fill-current',
                            )}
                          />
                        </Button>
                      </>
                    ) : null}
                    {canLock ? (
                      <Button
                        type="button"
                        size="sm"
                        isIconOnly
                        variant="ghost"
                        className="text-muted hover:text-foreground"
                        aria-label={thread.locked ? '解除锁定' : '锁定主题'}
                        aria-pressed={thread.locked}
                        onPress={handleToggleLock}
                      >
                        {thread.locked ? (
                          <Lock className="size-3.5" />
                        ) : (
                          <LockOpen className="size-3.5" />
                        )}
                      </Button>
                    ) : null}
                    {thread.canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        isIconOnly
                        variant="ghost"
                        className="text-muted hover:text-foreground"
                        aria-label="编辑主题"
                        onPress={() => setEditTarget({ kind: 'thread' })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {thread.canDelete ? (
                      <Button
                        type="button"
                        size="sm"
                        isIconOnly
                        variant="ghost"
                        className="text-muted hover:text-danger"
                        aria-label="删除主题"
                        onPress={() => setDeleteThreadOpen(true)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>

            <section className="relative flex flex-col gap-5" aria-label="回复">
              {threadReplies.length > 0 ? (
                threadReplies.map((reply) => {
                  const replyAuthor = reply.author
                  const fromThreadAuthor =
                    replyAuthor?.id === thread.author?.id

                  if (reply.deleted) {
                    return (
                      <article
                        key={reply.id}
                        id={`reply-${reply.id}`}
                        className="moon-reveal scroll-mt-6 rounded-2xl bg-surface p-4 sm:p-5"
                      >
                        <header className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-sm text-muted">
                            该楼层已删除
                          </span>
                          <Link
                            to={`/thread/${thread.id}#reply-${reply.id}`}
                            aria-label={`第 ${reply.floor} 楼的链接`}
                            className="ml-2 rounded px-1 py-0.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
                          >
                            #{reply.floor}
                          </Link>
                        </header>
                      </article>
                    )
                  }

                  return (
                    <article
                      key={reply.id}
                      id={`reply-${reply.id}`}
                      className="moon-reveal scroll-mt-6 rounded-2xl bg-surface p-4 sm:p-5"
                    >
                      <header className="flex flex-wrap items-center justify-between gap-3">
                        {replyAuthor ? (
                          <UserByline
                            user={replyAuthor}
                            date={reply.createdAt}
                            avatarSize="md"
                            showHandle={false}
                            badge={
                              fromThreadAuthor ? (
                                <span className="rounded-full bg-default px-1.5 py-0.5 text-xs text-muted">
                                  OP
                                </span>
                              ) : undefined
                            }
                          />
                        ) : (
                          <span className="text-sm text-muted">未知用户</span>
                        )}

                        <div className="flex items-center">
                          {reply.canEdit ? (
                            <Button
                              type="button"
                              size="sm"
                              isIconOnly
                              variant="ghost"
                              className="text-muted hover:text-foreground"
                              aria-label="编辑回复"
                              onPress={() =>
                                setEditTarget({ kind: 'reply', reply })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          ) : null}
                          {reply.canDelete ? (
                            <Button
                              type="button"
                              size="sm"
                              isIconOnly
                              variant="ghost"
                              className="text-muted hover:text-danger"
                              aria-label="删除回复"
                              onPress={() => setReplyToDelete(reply)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                          <Link
                            to={`/thread/${thread.id}#reply-${reply.id}`}
                            aria-label={`第 ${reply.floor} 楼的链接`}
                            className="ml-2 rounded px-1 py-0.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
                          >
                            #{reply.floor}
                          </Link>
                        </div>
                      </header>

                      <PostContent
                        className="mt-5"
                        imageLightbox
                        replyReferences={{
                          threadId: thread.id,
                          replies: threadReplies,
                        }}
                      >
                        {reply.contentHtml ?? ''}
                      </PostContent>

                      <PostActions
                        className="mt-4"
                        liked={reply.likedByMe}
                        likeCount={reply.likeCount}
                        postLabel={`第 ${reply.floor} 楼`}
                        onLike={() => handleLikeReply(reply)}
                        onReply={() => handleReply(reply.floor)}
                        replyDisabled={thread.locked}
                      />
                    </article>
                  )
                })
              ) : repliesQuery.isPending ? (
                <LoadingState label="正在加载回复…" className="py-5" />
              ) : (
                <p className="py-5 text-center text-sm text-muted">
                  来写下第一条回复吧~
                </p>
              )}
              {/* 绝对定位，避免 gap 把间距也算到哨兵上，让回复框与最后一条的间距和楼层间距一致。 */}
              <div
                ref={sentinelRef}
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px"
              />
            </section>
          </div>

          <aside className="hidden lg:block" aria-label="主题信息与目录">
            <div className="space-y-4">
              <Button
                type="button"
                size="md"
                variant="primary"
                className="w-full"
                isDisabled={thread.locked}
                onPress={() => handleReply(0)}
              >
                <CornerUpLeft aria-hidden="true" className="size-4" />
                回复
              </Button>

              <Button
                type="button"
                size="md"
                variant="outline"
                aria-pressed={thread.likedByMe}
                aria-label={thread.likedByMe ? '取消主题的点赞' : '点赞主题'}
                className="w-full justify-center gap-2"
                onPress={handleLikeThread}
              >
                <Heart
                  aria-hidden="true"
                  className={cn(
                    'size-4',
                    thread.likedByMe && 'fill-current text-danger',
                  )}
                />
                点赞
                <span className="tabular-nums">{thread.likeCount}</span>
              </Button>

              <section
                aria-label="主题作者"
                className="rounded-2xl bg-surface p-4"
              >
                {author ? (
                  <UserByline
                    user={author}
                    date={thread.updatedAt || thread.createdAt}
                    avatarSize="md"
                    dateText={
                      edited
                        ? `最后编辑于 ${formatRelativeTime(thread.updatedAt)}`
                        : `发布于 ${formatRelativeTime(thread.createdAt)}`
                    }
                  />
                ) : (
                  <span className="text-sm text-muted">未知用户</span>
                )}
              </section>
            </div>

            <div className="sticky top-6 mt-5">
              <ThreadToc items={tocItems} />
            </div>
          </aside>
        </div>
      </main>

      <ReplyComposer ref={composerRef} threadId={thread.id} />

      <EditPostDialog
        isOpen={editTarget !== null}
        boardColor={board.color}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTarget(null)
        }}
        initialTitle={
          editTarget?.kind === 'thread' ? thread.title : undefined
        }
        initialContent={
          editTarget?.kind === 'reply'
            ? (editTarget.reply.contentHtml ?? '')
            : thread.contentHtml
        }
        floorOptions={
          editTarget?.kind === 'reply' ? replyReferenceOptions : undefined
        }
        onSave={async ({ title, content }) => {
          if (!editTarget) return

          if (editTarget.kind === 'thread') {
            await updateThread.mutateAsync({
              title,
              contentHtml: content,
            })
          } else {
            await updateReply.mutateAsync(content)
          }

          setEditTarget(null)
        }}
      />

      <ConfirmDialog
        isOpen={deleteThreadOpen}
        onOpenChange={setDeleteThreadOpen}
        title="删除这个主题？"
        description="主题和它下面的所有回复都会被删除，此操作无法撤销。"
        confirmLabel="删除主题"
        isPending={deleteThread.isPending}
        onConfirm={() => void handleDeleteThread()}
      />
      <ConfirmDialog
        isOpen={replyToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReplyToDelete(null)
        }}
        title="删除这条回复？"
        description="删除后无法恢复。"
        isPending={deleteReply.isPending}
        onConfirm={() => void handleDeleteReply()}
      />
    </div>
  )
}