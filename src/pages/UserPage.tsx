import { Button, TextArea, Tooltip, cn } from '@heroui/react'
import { Brush, Camera, Heart, Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AvatarCropDialog } from '@/components/AvatarCropDialog'
import { ProfileCustomizeDialog } from '@/components/ProfileCustomizeDialog'
import { ThreadCard } from '@/components/ThreadCard'
import { UserAvatar } from '@/components/UserAvatar'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTimeAgo,
  makeExcerpt,
} from '@/lib/utils'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { User } from '@/types'

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
    updateUserBio,
  } = useForum()
  const user = users.find((candidate) => candidate.id === id)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

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
  const isSelf = currentUser?.id === user.id
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

  const profileBio =
    user.bio || isSelf ? (
      <ProfileBio
        key={user.id}
        user={user}
        canEdit={isSelf}
        onSave={(bio) => updateUserBio(user.id, bio)}
      />
    ) : null

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

  const overview = (
    <div className="flex shrink-0 gap-8">
      <div>
        <div className="text-lg font-medium">{userThreads.length}</div>
        <div className="text-xs text-muted">主题</div>
      </div>
      <div>
        <div className="text-lg font-medium">{userReplies.length}</div>
        <div className="text-xs text-muted">回复</div>
      </div>
      <div>
        <div className="text-lg font-medium">{likers.length}</div>
        <div className="text-xs text-muted">获赞</div>
      </div>
      <div>
        <Tooltip delay={0} closeDelay={0}>
          <Tooltip.Trigger
            tabIndex={0}
            className="block w-fit cursor-default rounded-sm text-lg font-medium outline-none focus-visible:outline-2 focus-visible:outline-foreground/40"
          >
            {formatTimeAgo(user.joinedAt)}
          </Tooltip.Trigger>
          <Tooltip.Content>{formatDate(user.joinedAt)}</Tooltip.Content>
        </Tooltip>
        <div className="text-xs text-muted">加入时间</div>
      </div>
    </div>
  )

  return (
    <main className="w-full pb-10 sm:pb-12">
      {background ? (
        <div
          className="relative h-[40vh] w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${background}")` }}
        >
          <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-5">
            {actionButtons}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'mx-auto w-full max-w-[69.25rem] px-4',
          background ? 'pt-5' : 'pt-10 sm:pt-12',
        )}
      >
        <header className="flex flex-wrap items-start gap-4">
          <div
            className={cn(
              'relative shrink-0',
              background && 'z-10 -mt-9',
            )}
          >
            <UserAvatar user={user} size="lg" className="size-20" />
            {isSelf ? (
              <button
                type="button"
                aria-label="更换头像"
                onClick={() => setAvatarOpen(true)}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground hover:opacity-100"
              >
                <Camera className="size-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className={cn('min-w-48 flex-1', background && '-mt-2.5')}>
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
            <p className="mt-0.5 text-sm text-muted">@{user.handle}</p>
            {background ? null : profileBio ? (
              <div className="mt-3">{profileBio}</div>
            ) : null}
          </div>

          <div className="ml-auto flex shrink-0 flex-col items-end gap-3">
            {background ? overview : actionButtons}
          </div>
        </header>

        {background && profileBio ? (
          <div className="mt-4">{profileBio}</div>
        ) : null}

        {background ? null : (
          <section
            className="mt-6 border-b border-border pb-4"
            aria-label="概览"
          >
            {overview}
          </section>
        )}

        <section className="mt-8" aria-labelledby="user-threads-heading">
          <h2 id="user-threads-heading" className="text-base font-medium">
            主题
          </h2>
          <div className="mt-4 space-y-5">
            {userThreads.length > 0 ? (
              userThreads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} showBoard />
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
                      <time
                        dateTime={reply.createdAt}
                        title={formatDateTime(reply.createdAt)}
                      >
                        {formatRelativeTime(reply.createdAt)}
                      </time>
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

      <AvatarCropDialog
        isOpen={avatarOpen}
        onOpenChange={setAvatarOpen}
        user={user}
      />
    </main>
  )
}

function ProfileBio({
  user,
  canEdit,
  onSave,
}: {
  user: User
  canEdit: boolean
  onSave: (bio: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user.bio)

  function beginEditing() {
    setDraft(user.bio)
    setEditing(true)
  }

  function save() {
    onSave(draft.trim())
    setEditing(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save()
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="text-sm leading-6">
        <TextArea
          autoFocus
          aria-label="个人介绍"
          placeholder="介绍一下自己…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setEditing(false)
            } else if (
              (event.metaKey || event.ctrlKey) &&
              event.key === 'Enter'
            ) {
              event.preventDefault()
              save()
            }
          }}
          className="h-24 w-full resize-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            onPress={() => setEditing(false)}
          >
            取消
          </Button>
          <Button type="submit" size="sm" variant="primary">
            保存
          </Button>
        </div>
      </form>
    )
  }

  if (!user.bio) {
    if (!canEdit) return null

    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5 text-muted hover:text-foreground"
        onPress={beginEditing}
      >
        <Plus className="size-3.5" aria-hidden="true" />
        添加个人介绍
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <p className="text-sm leading-6">{user.bio}</p>
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          isIconOnly
          variant="ghost"
          className="text-muted hover:text-foreground"
          aria-label="编辑个人介绍"
          onPress={beginEditing}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
