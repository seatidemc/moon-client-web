import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { getBoardIcon } from '@/lib/board-icons'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'

export function BoardsPage() {
  const { boards, threads } = useForum()
  usePageTitle('板块')

  return (
    <main className="mx-auto w-full max-w-[69.25rem] px-4 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">板块</h1>

      <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => {
          const boardThreads = threads.filter(
            (thread) => thread.boardId === board.id,
          )
          const BoardIcon = getBoardIcon(board.icon)

          return (
            <li key={board.id} className="min-w-0">
              <Link
                to={`/topic/${board.id}`}
                className="group flex h-full items-center gap-4 rounded-2xl bg-surface p-4 transition duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-surface-secondary active:scale-[0.98] active:bg-surface-tertiary active:duration-100 sm:p-5"
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${board.color} 14%, transparent)`,
                    color: board.color,
                  }}
                >
                  <BoardIcon className="size-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl leading-6 font-minecraft-sc">
                    {board.name}
                  </h2>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted">
                    {board.description}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {boardThreads.length} 个主题
                  </p>
                </div>

                <ChevronRight
                  className="size-4 shrink-0 text-muted group-hover:text-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}