import { Link, useParams } from 'react-router-dom'

import { ThreadListItem } from '@/components/ThreadListItem'
import { UserAvatar } from '@/components/UserAvatar'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  makeExcerpt,
} from '@/lib/utils'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function UserPage() {
  const { id } = useParams()
  const { users, threads, replies, boards, currentUser } = useForum()
  const user = users.find((candidate) => candidate.id === id)

  usePageTitle(user ? `${user.name} 的主页` : '用户不存在')

  if (!user) return <NotFoundPage />

  const userThreads = threads
    .filter((thread) => thread.authorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const userReplies = replies
    .filter((reply) => reply.authorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const isSelf = currentUser?.id === user.id

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
      <header className="flex items-start gap-4">
        <UserAvatar user={user} size="lg" className="size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
            {isSelf ? (
              <span className="rounded bg-default px-1.5 py-0.5 text-xs text-muted">
                这是你
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted">@{user.handle}</p>
          {user.bio ? (
            <p className="mt-3 text-sm leading-6">{user.bio}</p>
          ) : null}
          <p className="mt-3 text-xs text-muted">
            加入于 {formatDate(user.joinedAt)}
          </p>
        </div>
      </header>

      <div className="mt-6 flex gap-8 border-y border-border py-4">
        <div>
          <div className="text-lg font-medium">{userThreads.length}</div>
          <div className="text-xs text-muted">主题</div>
        </div>
        <div>
          <div className="text-lg font-medium">{userReplies.length}</div>
          <div className="text-xs text-muted">回复</div>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="user-threads-heading">
        <h2 id="user-threads-heading" className="text-base font-medium">
          主题
        </h2>
        <div className="mt-2 divide-y divide-border border-t border-border">
          {userThreads.length > 0 ? (
            userThreads.map((thread) => (
              <ThreadListItem key={thread.id} thread={thread} showBoard />
            ))
          ) : (
            <p className="py-8 text-sm text-muted">还没有发布主题。</p>
          )}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="user-replies-heading">
        <h2 id="user-replies-heading" className="text-base font-medium">
          回复
        </h2>
        <div className="mt-2 divide-y divide-border border-t border-border">
          {userReplies.length > 0 ? (
            userReplies.map((reply) => {
              const thread = threads.find((item) => item.id === reply.threadId)
              if (!thread) return null

              const board = boards.find((item) => item.id === thread.boardId)

              return (
                <article key={reply.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                    <span>回复了</span>
                    <Link
                      to={`/thread/${thread.id}#reply-${reply.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {thread.title}
                    </Link>
                    {board ? <span>· {board.name}</span> : null}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
                    {makeExcerpt(reply.content, 140)}
                  </p>
                  <time
                    dateTime={reply.createdAt}
                    title={formatDateTime(reply.createdAt)}
                    className="mt-1.5 block text-xs text-muted"
                  >
                    {formatRelativeTime(reply.createdAt)}
                  </time>
                </article>
              )
            })
          ) : (
            <p className="py-8 text-sm text-muted">还没有回复。</p>
          )}
        </div>
      </section>
    </main>
  )
}
