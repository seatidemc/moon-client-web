import { cn } from '@heroui/react'
import { Link } from 'react-router-dom'

interface TagListProps {
  tags: string[]
  className?: string
}

export function TagList({ tags, className }: TagListProps) {
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {tags.map((tag) => (
        <Link
          key={tag}
          to={`/search?q=${encodeURIComponent(`#${tag}`)}`}
          className="rounded bg-default px-1.5 py-0.5 text-xs text-default-foreground transition-colors hover:bg-default-hover"
          aria-label={`搜索标签 ${tag}`}
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
