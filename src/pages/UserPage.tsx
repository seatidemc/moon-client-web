import { Button, TextArea, Tooltip, cn } from '@heroui/react'
import { Brush, Camera, Heart, Pencil, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AvatarCropDialog } from '@/components/AvatarCropDialog'
import { LoadingState } from '@/components/LoadingState'
import { NicknameEditDialog } from '@/components/NicknameEditDialog'
import { Pagination } from '@/components/Pagination'
import { PendingButton } from '@/components/PendingButton'
import { ProfileCustomizeDialog } from '@/components/ProfileCustomizeDialog'
import { ThreadCard } from '@/components/ThreadCard'
import { UserAvatar } from '@/components/UserAvatar'
import { getAvatarShape, getAvatarShapeClassName } from '@/lib/avatar'
import { useForum } from '@/lib/forum-context'
import { mediaUrl } from '@/lib/media'
import {
  useSetUserLike,
  useUpdateProfile,
  useUserProfile,
  useUserReplies,
  useUserThreads,
} from '@/lib/queries'
import { getDisplayName } from '@/lib/user'
import { usePageTitle } from '@/lib/use-page-title'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatTimeAgo,
  makeExcerpt,
} from '@/lib/utils'
import { NotFoundPage } from '@/pages/NotFoundPage'
import type { UserProfile } from '@/types'

export function UserPage() {
  const { id } = useParams()
  const userId = Number(id)

  const { currentUser, openLogin } = useForum()
  const userQuery = useUserProfile(userId)

  // 切换用户时把两个列表的页码一起归零，避免沿用上一个用户的页码。
  const [pages, setPages] = useState({ userId, threads: 1, replies: 1 })
  if (pages.userId !== userId) {
    setPages({ userId, threads: 1, replies: 1 })
  }
  const threadsPage = pages.userId === userId ? pages.threads : 1
  const repliesPage = pages.userId === userId ? pages.replies : 1

  const threadsQuery = useUserThreads(userId, threadsPage)
  const repliesQuery = useUserReplies(userId, repliesPage)
  const likeUser = useSetUserLike(userId)
  const updateProfile = useUpdateProfile()

  const user = userQuery.data
  const userThreads = threadsQuery.data?.items ?? []
  const userReplies = repliesQuery.data?.items ?? []
  const threadsEmpty =
    userThreads.length === 0 &&
    !threadsQuery.isPending &&
    !threadsQuery.isError
  const repliesEmpty =
    userReplies.length === 0 &&
    !repliesQuery.isPending &&
    !repliesQuery.isError

  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [nicknameOpen, setNicknameOpen] = useState(false)

  function changeThreadsPage(next: number) {
    if (!currentUser) {
      openLogin()
      return
    }

    setPages((current) => ({ ...current, threads: next }))
  }

  function changeRepliesPage(next: number) {
    if (!currentUser) {
      openLogin()
      return
    }

    setPages((current) => ({ ...current, replies: next }))
  }

  // 加载中保持当前标题，避免闪现“用户不存在”或默认标题。
  usePageTitle(
    user
      ? `${getDisplayName(user)} 的主页`
      : userQuery.isError
        ? '用户不存在'
        : null,
  )

  if (!Number.isFinite(userId) || userId <= 0 || userQuery.isError) {
    return <NotFoundPage />
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[69.25rem] px-4 py-16">
        <LoadingState label="正在加载用户…" />
      </main>
    )
  }

  const displayName = getDisplayName(user)
  const liked = user.likedByMe
  const isSelf = user.isSelf
  const background = user.backgroundUrl
    ? mediaUrl(user.backgroundUrl)
    : null
  const avatarShape = getAvatarShape(user)
  const onBackgroundClass =
    background &&
    'border-0 bg-foreground/30 text-background backdrop-blur-sm hover:bg-foreground/45'

  function handleLike() {
    if (!currentUser) {
      openLogin()
      return
    }

    likeUser.mutate(!liked)
  }

  const profileBio =
    user.bio || isSelf ? (
      <ProfileBio
        key={user.id}
        user={user}
        canEdit={isSelf}
        onSave={async (bio) => {
          await updateProfile.mutateAsync({ bio })
        }}
      />
    ) : null

  const actionButtons = (
    <div className="flex shrink-0 items-center gap-2">
      {isSelf ? null : (
        <Button
          size="sm"
          variant={liked ? 'secondary' : 'outline'}
          onPress={handleLike}
          aria-pressed={liked}
          aria-label={liked ? `取消点赞 ${displayName}` : `点赞 ${displayName}`}
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
          <span className="tabular-nums">{user.profileLikeCount}</span>
        </Button>
      )}

      {isSelf ? (
        <Button
          size="sm"
          variant="outline"
          className={cn('gap-1.5', onBackgroundClass)}
          onPress={() => setCustomizeOpen(true)}
        >
          <Brush aria-hidden="true" />
          个性化
        </Button>
      ) : null}
    </div>
  )

  const overview = (
    <div className="flex shrink-0 gap-8">
      <div>
        <div className="text-lg font-medium">{user.threadCount}</div>
        <div className="text-xs text-muted">主题</div>
      </div>
      <div>
        <div className="text-lg font-medium">{user.replyCount}</div>
        <div className="text-xs text-muted">回复</div>
      </div>
      <div>
        <div className="text-lg font-medium">{user.profileLikeCount}</div>
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
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground hover:opacity-100',
                  getAvatarShapeClassName(avatarShape),
                )}
              >
                <Camera className="size-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className={cn('min-w-48 flex-1', background && '-mt-2.5')}>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {displayName}
              </h1>
              {isSelf ? (
                <Button
                  type="button"
                  size="sm"
                  isIconOnly
                  variant="ghost"
                  className="text-muted hover:text-foreground"
                  aria-label="编辑昵称"
                  onPress={() => setNicknameOpen(true)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted">@{user.username}</p>
            {background ? null : profileBio ? (
              <div className="mt-3">{profileBio}</div>
            ) : null}
          </div>

          <div
            className={cn(
              'flex shrink-0 flex-col gap-3',
              // 概览在移动端换行后居左，桌面端仍靠右。
              background ? 'sm:ml-auto sm:items-end' : 'ml-auto items-end',
            )}
          >
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="user-threads-heading"
              className="text-base font-medium"
            >
              主题
            </h2>
            {threadsQuery.data ? (
              <Pagination
                page={threadsQuery.data.page}
                pageSize={threadsQuery.data.pageSize}
                total={threadsQuery.data.total}
                label="主题"
                isDisabled={threadsQuery.isFetching}
                onChange={changeThreadsPage}
              />
            ) : null}
          </div>
          <div
            className={cn(
              'transition-opacity',
              !threadsEmpty && 'mt-4 space-y-5',
              threadsQuery.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={threadsQuery.isFetching}
          >
            {userThreads.length > 0 ? (
              userThreads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} showBoard />
              ))
            ) : threadsQuery.isPending ? (
              <LoadingState label="正在加载主题…" className="py-8" />
            ) : threadsQuery.isError ? (
              <p className="py-8 text-sm text-muted">主题加载失败，请稍后重试</p>
            ) : (
              <p className="mt-2 pb-8 text-sm text-muted">还没有发布主题</p>
            )}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="user-replies-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="user-replies-heading"
              className="text-base font-medium"
            >
              回复
            </h2>
            {repliesQuery.data ? (
              <Pagination
                page={repliesQuery.data.page}
                pageSize={repliesQuery.data.pageSize}
                total={repliesQuery.data.total}
                label="回复"
                isDisabled={repliesQuery.isFetching}
                onChange={changeRepliesPage}
              />
            ) : null}
          </div>
          <div
            className={cn(
              'divide-y divide-border transition-opacity',
              !repliesEmpty && 'mt-2',
              repliesQuery.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={repliesQuery.isFetching}
          >
            {userReplies.length > 0 ? (
              userReplies.map((reply) => (
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
                      to={`/thread/${reply.threadId}#reply-${reply.id}`}
                      className="font-minecraft-sc text-foreground hover:underline"
                    >
                      {reply.threadTitle ?? '主题'}
                    </Link>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-foreground">
                    {makeExcerpt(reply.contentHtml ?? '', 140)}
                  </p>
                </article>
              ))
            ) : repliesQuery.isPending ? (
              <LoadingState label="正在加载回复…" className="py-8" />
            ) : repliesQuery.isError ? (
              <p className="py-8 text-sm text-muted">回复加载失败，请稍后重试。</p>
            ) : (
              <p className="mt-2 pb-8 text-sm text-muted">还没有回复。</p>
            )}
          </div>
        </section>
      </div>

      <ProfileCustomizeDialog
        isOpen={customizeOpen}
        onOpenChange={setCustomizeOpen}
        backgroundUrl={background}
      />

      <NicknameEditDialog
        isOpen={nicknameOpen}
        onOpenChange={setNicknameOpen}
        user={user}
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
  user: UserProfile
  canEdit: boolean
  onSave: (bio: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(user.bio)
  const [saving, setSaving] = useState(false)

  function beginEditing() {
    setDraft(user.bio)
    setEditing(true)
  }

  async function save() {
    if (saving) return

    setSaving(true)
    try {
      await onSave(draft.trim())
      setEditing(false)
    } catch {
      // 全局错误提示已展示；保留编辑态方便重试。
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="text-sm leading-6">
        <TextArea
          autoFocus
          maxLength={200}
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
              void save()
            }
          }}
          className="h-24 w-full resize-none"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isDisabled={saving}
            onPress={() => setEditing(false)}
          >
            取消
          </Button>
          <PendingButton
            type="submit"
            size="sm"
            variant="primary"
            isPending={saving}
          >
            保存
          </PendingButton>
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