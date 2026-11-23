import { Button, cn } from '@heroui/react'
import { Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  BoardDecoration,
  type BoardDecorationVariant,
} from '@/components/BoardDecoration'
import { FeedLayout } from '@/components/FeedLayout'
import { NewThreadDialog } from '@/components/NewThreadDialog'
import { ThreadCard } from '@/components/ThreadCard'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import {
  flattenPages,
  useBoard,
  useSetBoardFollow,
  useThreads,
} from '@/lib/queries'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePageTitle } from '@/lib/use-page-title'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** 板块头部装饰排布：radial = 球形辐射，tiled = 平铺 */
const DECORATION_VARIANT: BoardDecorationVariant = 'tiled'

export function TopicPage() {
  const { slug } = useParams()
  const { currentUser, openLogin } = useForum()
  const boardQuery = useBoard(slug)
  const threadsQuery = useThreads(slug)
  const follow = useSetBoardFollow(slug)
  const [composerOpen, setComposerOpen] = useState(false)

  const board = boardQuery.data
  const threads = flattenPages(threadsQuery.data)
  const sentinelRef = useInfiniteScroll({
    hasNextPage: threadsQuery.hasNextPage,
    isFetchingNextPage: threadsQuery.isFetchingNextPage,
    fetchNextPage: threadsQuery.fetchNextPage,
  })

  usePageTitle(board?.name)

  if (boardQuery.isError) return <NotFoundPage />
  if (!board) {
    return (
      <main className="mx-auto w-full max-w-[69.25rem] px-4 py-16">
        <p className="text-center text-sm text-muted">正在加载板块…</p>
      </main>
    )
  }

  const following = board.followingByMe

  const themeStyle = getBoardThemeStyle(board.color)

  function openComposer() {
    if (!currentUser) {
      openLogin(() => setComposerOpen(true))
      return
    }

    setComposerOpen(true)
  }

  function handleFollow() {
    if (!currentUser) {
      openLogin()
      return
    }

    follow.mutate(!following)
  }

  return (
    // 装饰图标的遮罩会向右外溢；不裁切的话移动端的布局视口会被撑宽，
    // 右下角的悬浮按钮也会被推到屏幕外。
    <div className="relative overflow-x-clip">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-48"
        style={{
          backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, ${board.color} 12%, transparent), transparent)`,
        }}
      />

      <BoardDecoration
        icon={board.icon}
        color={board.color}
        variant={DECORATION_VARIANT}
      />

      <main className="relative">
        <div className="mx-auto w-full max-w-[69.25rem] px-4 pt-10 sm:pt-12">
          <div
            className="flex items-start justify-between gap-4"
            style={themeStyle}
          >
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                {board.name}
              </h1>
              <p className="mt-1.5 text-sm text-muted">{board.description}</p>
            </div>

            <Button
              type="button"
              size="sm"
              variant={following ? 'outline' : 'primary'}
              aria-pressed={following}
              aria-label={
                following ? `取消关注 ${board.name}` : `关注 ${board.name}`
              }
              className={cn(
                'shrink-0 gap-1.5',
                following &&
                  'border-accent/40 bg-white text-(--content-accent)',
              )}
              onPress={handleFollow}
            >
              {following ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              {following ? '已关注' : '关注'}
            </Button>
          </div>
        </div>

        <div className="mt-8 pb-10 sm:pb-12">
          <FeedLayout boardSlug={board.slug} boardColor={board.color}>
            {threads.length > 0 ? (
              <>
                {threads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} />
                ))}
                <div ref={sentinelRef} aria-hidden="true" className="h-px" />
              </>
            ) : threadsQuery.isPending ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted">正在加载主题…</p>
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-sm text-muted">这个板块还没有主题</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onPress={openComposer}
                >
                  发布第一个主题
                </Button>
              </div>
            )}
          </FeedLayout>

          <NewThreadDialog
            isOpen={composerOpen}
            onOpenChange={setComposerOpen}
            boardId={board.id}
          />
        </div>
      </main>
    </div>
  )
}