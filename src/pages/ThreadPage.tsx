import { Button } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MarkdownView } from '@/components/MarkdownView'
import { ReplyComposer } from '@/components/ReplyComposer'
import { TagList } from '@/components/TagList'
import { UserByline } from '@/components/UserByline'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import type { Reply } from '@/types'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function ThreadPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    users,
    boards,
    threads,
    replies,
    currentUser,
    deleteThread,
    deleteReply,
  } = useForum()
  const [deleteThreadOpen, setDeleteThreadOpen] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<Reply | null>(null)

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
    <main className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-3xl flex-col px-4 pt-8 sm:pt-10">
      <Breadcrumbs
        items={[
          { label: '板块', to: '/' },
          ...(board
            ? [{ label: board.name, to: `/topic/${board.id}` }]
            : []),
          { label: thread.title },
        ]}
      />

      <article className="mt-4">
        <h1 className="break-words font-minecraft-sc text-2xl leading-tight tracking-tight sm:text-3xl">
          {thread.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          {author ? (
            <UserByline user={author} date={thread.createdAt} />
          ) : (
            <span className="text-sm text-muted">未知用户</span>
          )}

          {isThreadAuthor ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger"
              onPress={() => setDeleteThreadOpen(true)}
            >
              <Trash2 />
              删除主题
            </Button>
          ) : null}
        </div>

        <MarkdownView className="mt-6">{thread.content}</MarkdownView>
        <TagList tags={thread.tags} className="mt-6" />
      </article>

      <section className="mt-2" aria-label="跟帖">
        {threadReplies.length > 0 ? (
          <div className="divide-y divide-border border-t border-border">
            {threadReplies.map((reply, index) => {
              const replyAuthor = users.find(
                (user) => user.id === reply.authorId,
              )
              const canDelete = currentUser?.id === reply.authorId
              const fromThreadAuthor = reply.authorId === thread.authorId

              return (
                <article key={reply.id} id={`reply-${reply.id}`} className="py-6">
                  <header className="flex flex-wrap items-center justify-between gap-3">
                    {replyAuthor ? (
                      <UserByline
                        user={replyAuthor}
                        date={reply.createdAt}
                        badge={
                          fromThreadAuthor ? (
                            <span className="rounded bg-default px-1.5 py-0.5 text-xs text-muted">
                              楼主
                            </span>
                          ) : undefined
                        }
                      />
                    ) : (
                      <span className="text-sm text-muted">未知用户</span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">#{index + 1}</span>
                      {canDelete ? (
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
                      ) : null}
                    </div>
                  </header>

                  <MarkdownView className="mt-3">{reply.content}</MarkdownView>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="border-t border-border py-10 text-center text-sm text-muted">
            还没有跟帖，来写下第一帖吧。
          </p>
        )}
      </section>

      <ReplyComposer threadId={thread.id} />

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
    </main>
  )
}
