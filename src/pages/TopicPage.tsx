import { Button } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { NewThreadDialog } from '@/components/NewThreadDialog'
import { ThreadListItem } from '@/components/ThreadListItem'
import { getBoardIcon } from '@/lib/board-icons'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** 所有装饰图标统一使用同一旋转角度，与彗核保持一致 */
const DECORATION_ROTATE = -10

/**
 * 板块页头部背景的装饰图标布局：一颗彗星。
 * 第一项是彗核（大图标），其余小图标从彗核向四周辐射散开，
 * 越靠外越小、越淡、笔画越细，形成密集的彗发。
 */
const DECORATION_ICONS = [
  // 彗核
  { left: 1.7, top: 1.5, size: 4.2, opacity: 0.38, strokeWidth: 1.05 },
  // 内圈：紧贴彗核
  { left: 6.21, top: 3.68, size: 1.55, opacity: 0.32, strokeWidth: 1.45 },
  { left: 4.43, top: 5.78, size: 1.45, opacity: 0.31, strokeWidth: 1.5 },
  { left: 1.6, top: 5.73, size: 1.4, opacity: 0.31, strokeWidth: 1.5 },
  { left: 0.42, top: 3.65, size: 1.35, opacity: 0.3, strokeWidth: 1.5 },
  { left: 0.77, top: 0.81, size: 1.3, opacity: 0.3, strokeWidth: 1.55 },
  { left: 3.4, top: 0.39, size: 1.25, opacity: 0.3, strokeWidth: 1.55 },
  { left: 5.48, top: 0.91, size: 1.4, opacity: 0.31, strokeWidth: 1.5 },
  // 中圈
  { left: 6.12, top: 5.63, size: 1.15, opacity: 0.2, strokeWidth: 1.6 },
  { left: 3.14, top: 6.97, size: 1.05, opacity: 0.19, strokeWidth: 1.65 },
  { left: 0.19, top: 5.28, size: 1.0, opacity: 0.18, strokeWidth: 1.65 },
  { left: 0.05, top: 2.53, size: 1.0, opacity: 0.18, strokeWidth: 1.65 },
  { left: 2.05, top: -0.03, size: 0.95, opacity: 0.17, strokeWidth: 1.7 },
  { left: 6.99, top: 2.29, size: 1.05, opacity: 0.18, strokeWidth: 1.65 },
  // 外圈：零星飞散
  { left: 5.6, top: 7.05, size: 0.9, opacity: 0.14, strokeWidth: 1.75 },
  { left: 7.83, top: 3.9, size: 1.0, opacity: 0.13, strokeWidth: 1.8 },
  { left: 0.41, top: 6.42, size: 0.9, opacity: 0.13, strokeWidth: 1.8 },
  { left: -0.04, top: 0.5, size: 0.9, opacity: 0.12, strokeWidth: 1.85 },
]

export function TopicPage() {
  const { id } = useParams()
  const { boards, threads, currentUser, openLogin } = useForum()
  const [composerOpen, setComposerOpen] = useState(false)
  const board = boards.find((item) => item.id === id)

  usePageTitle(board?.name)

  if (!board) return <NotFoundPage />

  const BoardIcon = getBoardIcon(board.icon)
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

      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-6 left-6 h-36 w-full max-w-[28rem] overflow-hidden select-none"
        style={{
          color: board.color,
          maskImage:
            'linear-gradient(100deg, #000 72%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(100deg, #000 72%, transparent 100%)',
        }}
      >
        {DECORATION_ICONS.map((icon, index) => (
          <BoardIcon
            key={index}
            className="absolute"
            strokeWidth={icon.strokeWidth}
            style={{
              left: `${icon.left}rem`,
              top: `${icon.top}rem`,
              width: `${icon.size}rem`,
              height: `${icon.size}rem`,
              opacity: icon.opacity,
              transform: `rotate(${DECORATION_ROTATE}deg)`,
            }}
          />
        ))}
      </div>

      <main className="relative mx-auto w-full max-w-[69.25rem] px-4 py-8 sm:py-10">
        <Breadcrumbs items={[{ label: '板块', to: '/boards' }, { label: board.name }]} />

        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
            <p className="mt-1.5 text-sm text-muted">{board.description}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="shrink-0"
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
