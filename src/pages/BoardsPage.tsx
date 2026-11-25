import { Link } from 'react-router-dom'

import { BoardIcon } from '@/components/BoardIcon'
import { useBoards } from '@/lib/queries'
import { usePageTitle } from '@/lib/use-page-title'

export function BoardsPage() {
  const boardsQuery = useBoards()
  const boards = boardsQuery.data ?? []
  usePageTitle('板块')

  return (
    <main className="mx-auto w-full max-w-[69.25rem] px-4 py-10 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">板块</h1>

      {boards.length === 0 && !boardsQuery.isPending ? (
        <div className="mt-8 rounded-2xl bg-surface px-6 py-16 text-center">
          <p className="text-sm text-muted">还没有板块</p>
          <p className="mt-2 text-xs text-muted">
            请联系管理员创建板块后再发布主题
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <li key={board.id} className="min-w-0">
              <Link
                to={`/topic/${board.slug}`}
                className="group flex h-full items-center gap-4 rounded-2xl bg-surface p-4 transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-surface-secondary active:scale-[0.98] active:bg-surface-tertiary active:duration-100 sm:p-5"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center self-start rounded-xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${board.color} 14%, transparent)`,
                    color: board.color,
                  }}
                >
                  <BoardIcon
                    icon={board.icon}
                    color={board.color}
                    size="24px"
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl leading-6 font-minecraft-sc">
                    {board.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
                    {board.description}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {board.threadCount} 个主题
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}