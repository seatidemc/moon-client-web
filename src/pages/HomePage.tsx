import { Link } from 'react-router-dom'

import { FeedLayout } from '@/components/FeedLayout'
import { ThreadCard } from '@/components/ThreadCard'
import { flattenPages, useBoards, useThreads } from '@/lib/queries'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePageTitle } from '@/lib/use-page-title'

export function HomePage() {
  const boardsQuery = useBoards()
  const threadsQuery = useThreads()
  const threads = flattenPages(threadsQuery.data)
  const sentinelRef = useInfiniteScroll({
    hasNextPage: threadsQuery.hasNextPage,
    isFetchingNextPage: threadsQuery.isFetchingNextPage,
    fetchNextPage: threadsQuery.fetchNextPage,
  })
  usePageTitle()

  return (
    <main className="pt-10 pb-10 sm:pt-12 sm:pb-12">
      <FeedLayout>
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
            <p className="text-sm text-muted">还没有主题。</p>
            {boardsQuery.data?.[0] ? (
              <Link
                to={`/topic/${boardsQuery.data[0].slug}`}
                className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground"
              >
                去板块发布第一个主题
              </Link>
            ) : null}
          </div>
        )}
      </FeedLayout>
    </main>
  )
}