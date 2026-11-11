import { Button, cn } from '@heroui/react'
import { Brush, Heart } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ProfileCustomizeDialog } from '@/components/ProfileCustomizeDialog'
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
  const {
    users,
    threads,
    replies,
    userLikes,
    userBackgrounds,
    currentUser,
    openLogin,
    toggleUserLike,
  } = useForum()
  const user = users.find((candidate) => candidate.id === id)
  const [customizeOpen, setCustomizeOpen] = useState(false)

  usePageTitle(user ? `${user.name} 的主页` : '用户不存在')

  if (!user) return <NotFoundPage />

  const userThreads = threads
    .filter((thread) => thread.authorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const userReplies = replies
    .filter((reply) => reply.authorId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const likers = userLikes[user.id] ?? []
  const liked = currentUser ? likers.includes(currentUser.id) : false
  const background = userBackgrounds[user.id]
  const onBackgroundClass =
    background &&
    'border-0 bg-foreground/30 text-background backdrop-blur-sm hover:bg-foreground/45'

  function handleLike() {
    if (!user) return

    if (!currentUser) {
      openLogin()
      return
    }

    toggleUserLike(user.id)
  }

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant={liked ? 'secondary' : 'outline'}
        onPress={handleLike}
        aria-pressed={liked}
        aria-label={liked ? `取消点赞 ${user.name}` : `点赞 ${user.name}`}
        className={cn(
          'gap-1.5',
          liked && !background && 'text-foreground',
          onBackgroundClass,
        )}
      >
        <Heart
          className={liked ? 'fill-current text-danger' : undefined}
          aria-hidden="true"
        />
        <span className="tabular-nums">{likers.length}</span>
      </Button>

      <Button
        size="sm"
        variant="outline"
        className={cn('gap-1.5', onBackgroundClass)}
        onPress={() => setCustomizeOpen(true)}
      >
        <Brush aria-hidden="true" />
        个性化
      </Button>
    </div>
  )

  return (
    <main className="w-full pb-10 sm:pb-12">
      {background ? (
        <div
          className="relative -mt-14 h-[calc(30vh+3.5rem)] w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${background}")` }}
        >
          <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-5">
            {actionButtons}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'mx-auto w-full max-w-3xl px-4',
          background ? 'pt-8' : 'pt-10 sm:pt-12',
        )}
      >
        <header className="flex flex-wrap items-start gap-4">
          <UserAvatar user={user} size="lg" className="size-14" />
          <div className="min-w-48 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted">@{user.handle}</p>
            {user.bio ? (
              <p className="mt-3 text-sm leading-6">{user.bio}</p>
            ) : null}
            <p className="mt-3 text-xs text-muted">
              加入于 {formatDate(user.joinedAt)}
            </p>
          </div>

          {background ? null : actionButtons}
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
          <div className="mt-4 space-y-5">
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
          <div className="mt-2 divide-y divide-border">
            {userReplies.length > 0 ? (
              userReplies.map((reply) => {
                const thread = threads.find(
                  (item) => item.id === reply.threadId,
                )
                if (!thread) return null

                return (
                  <article key={reply.id} className="py-4">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted">
                      <span>回复了</span>
                      <Link
                        to={`/thread/${thread.id}#reply-${reply.id}`}
                        className="font-minecraft-sc text-foreground hover:underline"
                      >
                        {thread.title}
                      </Link>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground">
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
      </div>

      <ProfileCustomizeDialog
        isOpen={customizeOpen}
        onOpenChange={setCustomizeOpen}
        userId={user.id}
      />
    </main>
  )
}
