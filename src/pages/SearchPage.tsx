import { Button, Input } from '@heroui/react'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { TagList } from '@/components/TagList'
import { ThreadListItem } from '@/components/ThreadListItem'
import { useForum } from '@/lib/forum-context'
import { usePageTitle } from '@/lib/use-page-title'

export function SearchPage() {
  const { users, boards, threads, replies } = useForum()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const paramsKey = searchParams.toString()
  const [draft, setDraft] = useState<{
    paramsKey: string
    value: string
  } | null>(null)
  const input = draft?.paramsKey === paramsKey ? draft.value : query

  usePageTitle(query ? `搜索：${query}` : '搜索')

  function updateInput(value: string) {
    setDraft({ paramsKey, value })
  }

  const terms = query
    .toLocaleLowerCase('zh-CN')
    .split(/\s+/)
    .filter(Boolean)

  const results =
    terms.length === 0
      ? []
      : threads
          .filter((thread) => {
            const author = users.find((user) => user.id === thread.authorId)
            const board = boards.find((item) => item.id === thread.boardId)
            const threadReplies = replies.filter(
              (reply) => reply.threadId === thread.id,
            )
            const searchable = [
              thread.title,
              thread.content,
              ...thread.tags.flatMap((tag) => [tag, `#${tag}`]),
              author?.name ?? '',
              author?.handle ?? '',
              board?.name ?? '',
              ...threadReplies.map((reply) => reply.content),
            ]
              .join('\n')
              .toLocaleLowerCase('zh-CN')

            return terms.every((term) => searchable.includes(term))
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const tagCounts = new Map<string, number>()
  for (const thread of threads) {
    for (const tag of thread.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }
  const popularTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = input.trim()
    setDraft(null)
    setSearchParams(normalized ? { q: normalized } : {})
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">搜索</h1>

      <form onSubmit={handleSubmit} className="mt-5 flex items-center gap-2">
        <Input
          type="search"
          aria-label="搜索主题、标签或作者"
          fullWidth
          value={input}
          onChange={(event) => updateInput(event.target.value)}
          placeholder="搜索标题、正文、标签或作者"
          className="h-10"
        />
        <Button type="submit" variant="primary" className="shrink-0">
          <Search />
          搜索
        </Button>
      </form>

      {query ? (
        <section className="mt-8" aria-labelledby="search-results-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <h2 id="search-results-heading" className="text-sm font-medium">
              “{query}” 的结果
            </h2>
            <span className="text-xs text-muted">
              {results.length} 个主题
            </span>
          </div>

          {results.length > 0 ? (
            <div className="divide-y divide-border">
              {results.map((thread) => (
                <ThreadListItem key={thread.id} thread={thread} showBoard />
              ))}
            </div>
          ) : (
            <div className="py-14 text-center">
              <p className="text-sm text-muted">没有找到相关主题。</p>
              <p className="mt-2 text-xs text-muted">
                试试更短的关键词，或者换一个标签。
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-8">
          <p className="text-sm text-muted">
            输入关键词，搜索主题标题、正文、标签、作者与回复。多个关键词用空格分隔，也可以直接搜索{' '}
            <span className="whitespace-nowrap">#标签</span>。
          </p>

          {popularTags.length > 0 ? (
            <div className="mt-6">
              <h2 className="text-xs font-medium text-muted">热门标签</h2>
              <TagList tags={popularTags} className="mt-2" />
            </div>
          ) : null}
        </section>
      )}
    </main>
  )
}
