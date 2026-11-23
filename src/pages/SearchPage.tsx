import { Button, SearchField } from '@heroui/react'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

import { TagList } from '@/components/TagList'
import { ThreadCard } from '@/components/ThreadCard'
import {
  flattenPages,
  useHotTags,
  useSearchThreads,
} from '@/lib/queries'
import { useInfiniteScroll } from '@/lib/use-infinite-scroll'
import { usePageTitle } from '@/lib/use-page-title'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''
  const paramsKey = searchParams.toString()
  const [draft, setDraft] = useState<{
    paramsKey: string
    value: string
  } | null>(null)
  const input = draft?.paramsKey === paramsKey ? draft.value : query

  const searchQuery = useSearchThreads(query)
  const tagsQuery = useHotTags()
  const results = flattenPages(searchQuery.data)
  const total = searchQuery.data?.pages[0]?.total ?? 0
  const popularTags = (tagsQuery.data ?? []).map((tag) => tag.name)
  const sentinelRef = useInfiniteScroll({
    hasNextPage: searchQuery.hasNextPage,
    isFetchingNextPage: searchQuery.isFetchingNextPage,
    fetchNextPage: searchQuery.fetchNextPage,
  })

  usePageTitle(query ? `搜索：${query}` : '搜索')

  function updateInput(value: string) {
    if (value.trim() === '') {
      setDraft(null)
      if (query) setSearchParams({})
      return
    }
    setDraft({ paramsKey, value })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = input.trim()
    setDraft(null)
    setSearchParams(normalized ? { q: normalized } : {})
  }

  return (
    <main className="mx-auto w-full max-w-[69.25rem] px-4 py-10 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight">搜索</h1>

      <form onSubmit={handleSubmit} className="mt-5 flex items-center gap-2">
        <SearchField
          aria-label="搜索主题、标签或作者"
          fullWidth
          value={input}
          onChange={updateInput}
          className="min-w-0 flex-1"
        >
          <SearchField.Group className="h-10 rounded-full shadow-none">
            <SearchField.Input placeholder="搜索标题、正文、标签或作者" />
            <SearchField.ClearButton aria-label="清空搜索" />
          </SearchField.Group>
        </SearchField>
        <Button
          type="submit"
          variant="primary"
          aria-label="搜索"
          className="shrink-0 max-sm:w-10 max-sm:px-0"
        >
          <Search />
          <span className="max-sm:hidden">搜索</span>
        </Button>
      </form>

      {query ? (
        <section className="mt-8" aria-labelledby="search-results-heading">
          <h2 id="search-results-heading" className="text-sm font-medium">
            找到 {total} 个结果
          </h2>

          {results.length > 0 ? (
            <div className="mt-4 space-y-5">
              {results.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  showBoard
                  variant="compact"
                />
              ))}
              <div ref={sentinelRef} aria-hidden="true" className="h-px" />
            </div>
          ) : searchQuery.isPending ? (
            <div className="py-14 text-center">
              <p className="text-sm text-muted">正在搜索…</p>
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