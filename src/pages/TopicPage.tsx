import { Button } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ThreadComposer } from '@/components/ThreadComposer'
import { ThreadListItem } from '@/components/ThreadListItem'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function TopicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { boards, threads, currentUser, openLogin } = useForum()
  const [composerOpen, setComposerOpen] = useState(false)
  const board = boards.find((item) => item.id === id)

  usePageTitle(board?.name)

  if (!board) return <NotFoundPage />

  const boardThreads = threads
    .filter((thread) => thread.boardId === board.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function toggleComposer() {
    if (composerOpen) {
      setComposerOpen(false)
      return
    }

    if (!currentUser) {
      openLogin(() => setComposerOpen(true))
      return
    }

    setComposerOpen(true)
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <Breadcrumbs items={[{ label: '首页', to: '/' }, { label: board.name }]} />

      <div className="mt-4 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{board.name}</h1>
          <p className="mt-1.5 text-sm text-muted">{board.description}</p>
          <p className="mt-3 text-xs text-muted">
            {boardThreads.length} 个主题
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={composerOpen ? 'tertiary' : 'primary'}
          className="shrink-0"
          onPress={toggleComposer}
        >
          {composerOpen ? (
            '收起'
          ) : (
            <>
              <Plus />
              发帖
            </>
          )}
        </Button>
      </div>

      {composerOpen ? (
        <div className="mt-6">
          <ThreadComposer
            boardId={board.id}
            onPublished={(thread) => navigate(`/thread/${thread.id}`)}
            onCancel={() => setComposerOpen(false)}
          />
        </div>
      ) : null}

      <div className="mt-8 divide-y divide-border border-t border-border">
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
              onPress={toggleComposer}
            >
              发布第一个主题
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
