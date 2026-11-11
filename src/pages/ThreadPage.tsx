import { Button, TextArea } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MarkdownView } from '@/components/MarkdownView'
import { TagList } from '@/components/TagList'
import { UserAvatar } from '@/components/UserAvatar'
import { UserByline } from '@/components/UserByline'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import {
  formatDateTime,
  formatRelativeTime,
  markdownToPlainText,
} from '@/lib/utils'
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
    openLogin,
    deleteThread,
    createReply,
    deleteReply,
  } = useForum()
  const [replyText, setReplyText] = useState('')
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

  function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentUser) {
      openLogin()
      return
    }

    if (!markdownToPlainText(replyText)) return

    createReply({ threadId: thread!.id, content: replyText })
    setReplyText('')
  }

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
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
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
        <h1 className="break-words text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
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

      <section className="mt-10" aria-labelledby="replies-heading">
        <h2
          id="replies-heading"
          className="border-b border-border pb-3 text-base font-medium"
        >
          回复{' '}
          <span className="font-normal text-muted">{threadReplies.length}</span>
        </h2>

        {currentUser ? (
          <form
            onSubmit={handleReply}
            className="mt-5 rounded-xl border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex gap-3">
              <UserAvatar user={currentUser} />
              <div className="min-w-0 flex-1">
                <TextArea
                  fullWidth
                  aria-label="回复内容"
                  placeholder="写下你的回复…"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  className="min-h-28 resize-y"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">回复支持 Markdown</p>
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isDisabled={!markdownToPlainText(replyText)}
                  >
                    回复
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-4">
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

        <div className="mt-2 divide-y divide-border">
          {threadReplies.map((reply, index) => {
            const replyAuthor = users.find((user) => user.id === reply.authorId)
            const canDelete = currentUser?.id === reply.authorId

            return (
              <article
                key={reply.id}
                id={`reply-${reply.id}`}
                className="py-5"
              >
                <div className="flex gap-3">
                  {replyAuthor ? (
                    <Link
                      to={`/user/${replyAuthor.id}`}
                      aria-label={`查看 ${replyAuthor.name} 的主页`}
                    >
                      <UserAvatar user={replyAuthor} />
                    </Link>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="text-sm font-medium text-foreground">
                          {replyAuthor ? (
                            <Link
                              to={`/user/${replyAuthor.id}`}
                              className="hover:underline"
                            >
                              {replyAuthor.name}
                            </Link>
                          ) : (
                            '未知用户'
                          )}
                        </span>
                        {reply.authorId === thread.authorId ? (
                          <span className="rounded bg-default px-1.5 py-0.5">
                            楼主
                          </span>
                        ) : null}
                        <time
                          dateTime={reply.createdAt}
                          title={formatDateTime(reply.createdAt)}
                        >
                          {formatRelativeTime(reply.createdAt)}
                        </time>
                        <span>#{index + 1}</span>
                      </div>

                      {canDelete ? (
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
                    </div>

                    <MarkdownView className="mt-2 text-sm leading-7">
                      {reply.content}
                    </MarkdownView>
                  </div>
                </div>
              </article>
            )
          })}

          {threadReplies.length === 0 ? (
            <p className="py-8 text-sm text-muted">还没有回复。</p>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        isOpen={deleteThreadOpen}
        onOpenChange={setDeleteThreadOpen}
        title="删除这个主题？"
        description="主题和它下面的所有回复都会被删除，此操作无法撤销。"
        confirmLabel="删除主题"
        onConfirm={handleDeleteThread}
      />
      <ConfirmDialog
        isOpen={replyToDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReplyToDelete(null)
        }}
        title="删除这条回复？"
        description="删除后无法恢复。"
        onConfirm={handleDeleteReply}
      />
    </main>
  )
}
