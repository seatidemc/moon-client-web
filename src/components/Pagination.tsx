import { Button } from '@heroui/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  label: string
  /** 翻页请求进行中时禁用按钮，避免连点跳页。 */
  isDisabled?: boolean
  onChange: (page: number) => void
}

/** 前台列表的显式分页控件：只渲染当前页，通过箭头按钮切换。 */
export function Pagination({
  page,
  pageSize,
  total,
  label,
  isDisabled = false,
  onChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={`${label}分页`}
      className="flex flex-wrap items-center justify-end gap-3"
    >
      <div className="flex items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="上一页"
          isDisabled={isDisabled || page <= 1}
          onPress={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="tertiary"
          aria-label="下一页"
          isDisabled={isDisabled || page >= totalPages}
          onPress={() => onChange(page + 1)}
        >
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}