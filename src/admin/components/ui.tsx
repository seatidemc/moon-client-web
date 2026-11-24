import {
  Alert,
  Button,
  Card,
  Pagination as HeroPagination,
  Spinner,
  Surface,
  Typography,
} from '@heroui/react'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Typography.Heading
          level={1}
          className="text-xl font-semibold tracking-tight"
        >
          {title}
        </Typography.Heading>
        {description ? (
          <Typography.Paragraph size="sm" color="muted" className="mt-1">
            {description}
          </Typography.Paragraph>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <HeroPagination
      size="sm"
      className="flex flex-wrap items-center justify-between gap-2 pt-3"
    >
      <HeroPagination.Summary className="text-xs text-muted">
        共 {total} 条 · 第 {page} / {totalPages} 页
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={page <= 1}
            onPress={() => onChange(page - 1)}
          >
            <HeroPagination.PreviousIcon />
            上一页
          </HeroPagination.Previous>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onChange(page + 1)}
          >
            下一页
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  )
}

export function LoadingPanel({ label = '加载中…' }: { label?: string }) {
  return (
    <Surface className="flex items-center justify-center gap-2 px-4 py-10">
      <Spinner size="sm" color="accent" />
      <Typography.Paragraph size="sm" color="muted">
        {label}
      </Typography.Paragraph>
    </Surface>
  )
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>加载失败</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
        {onRetry ? (
          <Button
            size="sm"
            variant="tertiary"
            className="self-start"
            onPress={onRetry}
          >
            重试
          </Button>
        ) : null}
      </Alert.Content>
    </Alert>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <Card.Content>
        <Typography.Paragraph size="xs" color="muted">
          {label}
        </Typography.Paragraph>
        <Typography.Heading
          level={3}
          className="text-2xl font-semibold tracking-tight"
        >
          {value}
        </Typography.Heading>
        {hint ? (
          <Typography.Paragraph size="xs" color="muted">
            {hint}
          </Typography.Paragraph>
        ) : null}
      </Card.Content>
    </Card>
  )
}