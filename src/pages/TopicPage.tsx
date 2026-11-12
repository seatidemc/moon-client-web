import { Button } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import {
  BoardDecoration,
  type BoardDecorationVariant,
} from '@/components/BoardDecoration'
import { NewThreadDialog } from '@/components/NewThreadDialog'
import { ThreadListItem } from '@/components/ThreadListItem'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** 板块头部装饰排布：radial = 球形辐射，tiled = 平铺 */
const DECORATION_VARIANT: BoardDecorationVariant = 'tiled'

export function TopicPage() {
  const { id } = useParams()
  const { boards, threads, currentUser, openLogin } = useForum()
  const [composerOpen, setComposerOpen] = useState(false)
  const board = boards.find((item) => item.id === id)

  usePageTitle(board?.name)

  if (!board) return <NotFoundPage />

  const boardThreads = threads
    .filter((thread) => thread.boardId === board.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function openComposer() {
    if (!currentUser) {
      openLogin(() => setComposerOpen(true))
      return
    }

    setComposerOpen(true)
  }

  return (
    <div className="relative">
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

      <main className="relative mx-auto w-full max-w-[69.25rem] px-4 py-8 sm:py-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
            <p className="mt-1.5 text-sm text-muted">{board.description}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="shrink-0 transition-[filter] hover:brightness-95 active:brightness-90"
            style={{ backgroundColor: board.color }}
            onPress={openComposer}
          >
            <Plus />
            发帖
          </Button>
        </div>

        <div className="mt-8 space-y-5">
          {boardThreads.length > 0 ? (
            boardThreads.map((thread) => (
              <ThreadListItem key={thread.id} thread={thread} />
            ))
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">这个板块还没有主题。</p>
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
        </div>

        <NewThreadDialog
          isOpen={composerOpen}
          onOpenChange={setComposerOpen}
          boardId={board.id}
        />
      </main>
    </div>
  )
}
