import { Spinner, cn } from '@heroui/react'

interface LoadingStateProps {
  label?: string
  className?: string
}

/** 页面或列表的加载占位：HeroUI Spinner + 可选说明文字。 */
export function LoadingState({
  label = '加载中…',
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 text-sm text-muted',
        className,
      )}
    >
      <Spinner size="sm" color="current" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}