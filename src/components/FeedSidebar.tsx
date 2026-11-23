import { Button, Tooltip } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { NewThreadDialog } from '@/components/NewThreadDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { useForum } from '@/lib/forum-context'
import { useBoards, useRecentReplies } from '@/lib/queries'
import { getDisplayName } from '@/lib/user'
import { formatRelativeTime, truncateText } from '@/lib/utils'

interface FeedSidebarProps {
  /** 只显示该板块下的最近回复；为空时显示全部（首页） */
  boardSlug?: string
  /** 板块主题色，用于发帖按钮；为空时使用默认主色 */
  boardColor?: string
}

export function FeedSidebar({ boardSlug, boardColor }: FeedSidebarProps) {
  const { currentUser, openLogin } = useForum()
  const boardsQuery = useBoards()
  const recentQuery = useRecentReplies(boardSlug)
  const [composerOpen, setComposerOpen] = useState(false)

  const board = boardSlug
    ? boardsQuery.data?.find((item) => item.slug === boardSlug)
    : undefined
  const recentReplies = recentQuery.data ?? []

  function openComposer() {
    if (!currentUser) {
      openLogin(() => setComposerOpen(true))
      return
    }

    setComposerOpen(true)
  }

  return (
    <>
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:self-start">
        <div className="space-y-4">
          <Button
            type="button"
            size="md"
            variant="primary"
            className="w-full transition-[filter] hover:brightness-95 active:brightness-90"
            style={boardColor ? { backgroundColor: boardColor } : undefined}
            onPress={openComposer}
          >
            <Plus className="size-4" />
            发布帖子
          </Button>

          <section aria-label="最近回复" className="rounded-2xl bg-surface p-4">
            <h2 className="text-sm font-medium">最近回复</h2>

            {recentReplies.length > 0 ? (
              <ul className="mt-1 divide-y divide-border">
                {recentReplies.map((reply) => (
                  <li key={reply.id}>
                    <Link
                      to={`/thread/${reply.threadId}#reply-${reply.id}`}
                      className="group block py-3 text-sm leading-6 text-muted"
                    >
                      {reply.author ? (
                        <Tooltip delay={0} closeDelay={0}>
                          <Tooltip.Trigger
                            className="relative top-[-1.5px] mr-2 inline-flex align-middle"
                            render={(props) => <span {...props} />}
                          >
                            <UserAvatar user={reply.author} className="size-6" />
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            {getDisplayName(reply.author)}
                          </Tooltip.Content>
                        </Tooltip>
                      ) : null}
                      <span>{formatRelativeTime(reply.createdAt)}</span>
                      <span className="ml-2 text-foreground">
                        {truncateText(reply.excerpt, 40)}
                      </span>
                      <span className="mt-1 block text-xs">
                        {reply.threadTitle}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                {boardSlug ? '这个板块还没有回复。' : '还没有回复。'}
              </p>
            )}
          </section>
        </div>
      </aside>

      {/* 移动端没有侧边栏，发帖入口改为右下角的悬浮圆按钮，配色与侧边栏一致。 */}
      <Button
        type="button"
        isIconOnly
        size="lg"
        variant="primary"
        aria-label="发布帖子"
        className="fixed right-8 bottom-8 z-30 size-14 rounded-full shadow-lg transition-[filter] hover:brightness-95 active:brightness-90 lg:hidden"
        style={boardColor ? { backgroundColor: boardColor } : undefined}
        onPress={openComposer}
      >
        <Plus className="size-6" aria-hidden="true" />
      </Button>

      <NewThreadDialog
        isOpen={composerOpen}
        onOpenChange={setComposerOpen}
        boardId={board?.id}
      />
    </>
  )
}