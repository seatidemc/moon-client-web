import { Button, cn } from '@heroui/react'
import { Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EditPostDialog } from '@/components/EditPostDialog'
import { PostContent } from '@/components/PostContent'
import {
  ReplyComposer,
  type ReplyComposerHandle,
} from '@/components/ReplyComposer'
import { ThreadToc } from '@/components/ThreadToc'
import { UserByline } from '@/components/UserByline'
import {
  replyPostKey,
  threadPostKey,
  useForum,
} from '@/lib/forum-context'
import { buildReplyReferenceOptions } from '@/lib/reply-reference-options'
import { usePageTitle } from '@/lib/use-page-title'
import type { Reply } from '@/types'
import { NotFoundPage } from '@/pages/NotFoundPage'

type EditTarget = { kind: 'thread' } | { kind: 'reply'; reply: Reply }

interface PostActionsProps {
  postKey: string
  postLabel: string
  onReply: () => void
}

function PostActions({ postKey, postLabel, onReply }: PostActionsProps) {
  const { postLikes, currentUser, togglePostLike, openLogin } = useForum()
  const likers = postLikes[postKey] ?? []
  const liked = currentUser ? likers.includes(currentUser.id) : false

  function handleLike() {
    if (!currentUser) {
      openLogin()
      return
    }

    togglePostLike(postKey)
  }

  return (
    <div className="mt-4 flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-pressed={liked}
        aria-label={liked ? `取消${postLabel}的点赞` : `点赞${postLabel}`}
        className="gap-1.5 px-2 text-xs text-muted hover:text-foreground"
        onPress={handleLike}
      >
        <Heart
          aria-hidden="true"
          className={cn('size-4', liked && 'fill-current text-danger')}
        />
        <span className="tabular-nums">{likers.length}</span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`回复${postLabel}`}
        className="gap-1.5 px-2 text-xs text-muted hover:text-foreground"
        onPress={onReply}
      >
        <MessageCircle aria-hidden="true" className="size-4" />
        回复
      </Button>
    </div>
  )
}

export function ThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    users,
    boards,
    threads,
    replies,
    currentUser,
    openLogin,
    updateThread,
    deleteThread,
    updateReply,
    deleteReply,
  } = useForum()
  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<Reply | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const composerRef = useRef<ReplyComposerHandle>(null)

  const thread = threads.find((item) => item.id === id)
  const board = thread
    ? boards.find((item) => item.id === thread.boardId)
    : undefined
  const author = thread
    ? users.find((user) => user.id === thread.authorId)
    : undefined

  usePageTitle(thread?.title)

  if (!thread) return <NotFoundPage />

  const threadReplies = replies
    .filter((reply) => reply.threadId === thread.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const isThreadAuthor = currentUser?.id === thread.authorId
  const replyReferenceOptions = buildReplyReferenceOptions(
    thread,
    threadReplies,
    users,
  )
  const tocItems = [
    { id: 'thread-post', label: '主题' },
    ...threadReplies.map((reply, index) => ({
      id: `reply-${reply.id}`,
      label: `#${index + 1} ${
        users.find((user) => user.id === reply.authorId)?.name ?? '未知用户'
      }`,
    })),
  ]

  function handleDeleteThread() {
    deleteThread(thread!.id)
    setDeleteThreadOpen(false)
    navigate(`/topic/${thread!.boardId}`, { replace: true })
  }

  function handleDeleteReply() {
    if (!replyToDelete) return

    deleteReply(replyToDelete.id)
    setReplyToDelete(null)
  }

  function handleReply(reference: string) {
    const run = () => composerRef.current?.appendReplyReference(reference)

    if (!currentUser) {
      openLogin(() => requestAnimationFrame(run))
      return
    }

    run()
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col">
      <main className="mx-auto w-full max-w-[57.25rem] flex-1 px-4 pt-8 pb-4 sm:pt-10">
        <Breadcrumbs
          items={[
            { label: '板块', to: '/boards' },
            ...(board
              ? [{ label: board.name, to: `/topic/${board.id}` }]
              : []),
            { label: thread.title },
          ]}
        />

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,48rem)_6rem]">
          <div className="min-w-0 space-y-5">
            <article
              id="thread-post"
              className="scroll-mt-6 rounded-2xl bg-surface p-4 sm:p-5"
            >
              <h1 className="break-words font-minecraft-sc text-2xl leading-tight tracking-tight sm:text-3xl">
                {thread.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
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

                {isThreadAuthor ? (
                  <div className="flex items-center">
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
                  </div>
                ) : null}
              </div>

              <PostContent className="mt-6">{thread.content}</PostContent>

              <PostActions
                postKey={threadPostKey(thread.id)}
                postLabel="主题"
                onReply={() => handleReply('re#0')}
              />
            </article>

            <section className="space-y-5" aria-label="跟帖">
              {threadReplies.length > 0 ? (
                threadReplies.map((reply, index) => {
                  const replyAuthor = users.find(
                    (user) => user.id === reply.authorId,
                  )
                  const canModify = currentUser?.id === reply.authorId
                  const fromThreadAuthor = reply.authorId === thread.authorId

                  return (
                    <article
                      key={reply.id}
                      id={`reply-${reply.id}`}
                      className="scroll-mt-6 rounded-2xl bg-surface p-4 sm:p-5"
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
                          {canModify ? (
                            <>
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
                              <Button
                                type="button"
                                size="sm"
                                isIconOnly
                                variant="ghost"
                                className="text-muted hover:text-danger"
                                aria-label="删除跟帖"
                                onPress={() => setReplyToDelete(reply)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          ) : null}
                          <Link
                            to={`/thread/${thread.id}#reply-${reply.id}`}
                            aria-label={`第 ${index + 1} 楼的链接`}
                            className="ml-2 rounded px-1 py-0.5 text-xs text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
                          >
                            #{index + 1}
                          </Link>
                        </div>
                      </header>

                      <PostContent
                        className="mt-5"
                        replyReferences={{
                          threadId: thread.id,
                          replies: threadReplies,
                        }}
                      >
                        {reply.content}
                      </PostContent>

                      <PostActions
                        postKey={replyPostKey(reply.id)}
                        postLabel={`第 ${index + 1} 楼`}
                        onReply={() => handleReply(`re#${index + 1}`)}
                      />
                    </article>
                  )
                })
              ) : (
                <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-muted">
                  还没有跟帖，来写下第一帖吧。
                </p>
              )}
            </section>
          </div>

          <ThreadToc items={tocItems} />
        </div>
      </main>

      <ReplyComposer ref={composerRef} threadId={thread.id} />

      <EditPostDialog
        isOpen={editTarget !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTarget(null)
        }}
        initialTitle={
          editTarget?.kind === 'thread' ? thread.title : undefined
        }
        initialContent={
          editTarget?.kind === 'reply'
            ? editTarget.reply.content
            : thread.content
        }
        floorOptions={
          editTarget?.kind === 'reply' ? replyReferenceOptions : undefined
        }
        onSave={({ title, content }) => {
          if (!editTarget) return

          if (editTarget.kind === 'thread') {
            updateThread(thread.id, { title, content })
          } else {
            updateReply(editTarget.reply.id, content)
          }

          setEditTarget(null)
        }}
      />

      <ConfirmDialog
        isOpen={deleteThreadOpen}
        onOpenChange={setDeleteThreadOpen}
        title="删除这个主题？"
        description="主题和它下面的所有跟帖都会被删除，此操作无法撤销。"
        confirmLabel="删除主题"
        onConfirm={handleDeleteThread}
      />
      <ConfirmDialog
        isOpen={replyToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReplyToDelete(null)
        }}
        title="删除这条跟帖？"
        description="删除后无法恢复。"
        onConfirm={handleDeleteReply}
      />
    </div>
  )
}