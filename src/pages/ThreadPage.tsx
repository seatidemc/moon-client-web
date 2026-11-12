import { Button } from '@heroui/react'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EditPostDialog } from '@/components/EditPostDialog'
import { MarkdownView } from '@/components/MarkdownView'
import { ReplyComposer } from '@/components/ReplyComposer'
import { UserByline } from '@/components/UserByline'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import type { Reply } from '@/types'
import { NotFoundPage } from '@/pages/NotFoundPage'

type EditTarget = { kind: 'thread' } | { kind: 'reply'; reply: Reply }

export function ThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    users,
    boards,
    threads,
    replies,
    currentUser,
    updateThread,
    deleteThread,
    updateReply,
    deleteReply,
  } = useForum()
  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<Reply | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)

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

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-8 pb-4 sm:pt-10">
        <Breadcrumbs
          items={[
            { label: '板块', to: '/boards' },
            ...(board
              ? [{ label: board.name, to: `/topic/${board.id}` }]
              : []),
            { label: thread.title },
          ]}
        />

        <article className="rounded-2xl bg-surface p-4 sm:p-5">
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

          <MarkdownView className="mt-6">{thread.content}</MarkdownView>
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
                  className="rounded-2xl bg-surface p-4 sm:p-5"
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
                      <span className="ml-2 text-xs text-muted">
                        #{index + 1}
                      </span>
                    </div>
                  </header>

                  <MarkdownView className="mt-5">{reply.content}</MarkdownView>
                </article>
              )
            })
          ) : (
            <p className="rounded-2xl bg-surface px-4 py-10 text-center text-sm text-muted">
              还没有跟帖，来写下第一帖吧。
            </p>
          )}
        </section>
      </main>

      <ReplyComposer threadId={thread.id} />

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