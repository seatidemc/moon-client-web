import { Link } from 'react-router-dom'

import { HomeSidebar } from '@/components/HomeSidebar'
import { PinnedAnnouncements } from '@/components/PinnedAnnouncements'
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
    <>
      <PinnedAnnouncements />

      <main className="mx-auto w-full max-w-[69.25rem] px-4 pb-10 sm:pb-12">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,48rem)_18rem]">
          <div className="space-y-5">
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

          <HomeSidebar />
        </div>
      </main>
    </>
  )
}
