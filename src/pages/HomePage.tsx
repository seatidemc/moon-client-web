import { Link } from 'react-router-dom'

import { ThreadListItem } from '@/components/ThreadListItem'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'

export function HomePage() {
  const { boards, threads } = useForum()
  usePageTitle()

  const recentThreads = [...threads].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
      <div className="divide-y divide-border">
        {recentThreads.length > 0 ? (
          recentThreads.map((thread) => (
            <ThreadListItem key={thread.id} thread={thread} />
          ))
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted">还没有主题。</p>
            {boards[0] ? (
              <Link
                to={`/topic/${boards[0].id}`}
                className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground"
              >
                去板块发布第一个主题
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </main>
  )
}
