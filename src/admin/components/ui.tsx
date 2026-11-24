import { Button, Input, TextArea } from '@heroui/react'
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

import { cn } from '@heroui/react'

import { LoadingState } from '@/components/LoadingState'

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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

const BADGE_TONES = {
  neutral: 'bg-default text-foreground',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-accent-soft text-accent',
  warning: 'bg-default-soft text-foreground',
  danger: 'bg-danger/10 text-danger',
} as const

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof BADGE_TONES
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <Input fullWidth className={className} {...props} />
}

export function TextAreaInput({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <TextArea fullWidth className={className} {...props} />
}

const SELECT_CLASS =
  'h-9 w-full rounded-lg border border-field-border bg-field px-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent disabled:opacity-60'

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(SELECT_CLASS, className)} {...props}>
      {children}
    </select>
  )
}

export function CheckboxInput({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-sm',
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 rounded border-field-border accent-[var(--accent)]"
        {...props}
      />
      <span>{label}</span>
    </label>
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
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
      <p className="text-xs text-muted">
        共 {total} 条 · 第 {page} / {totalPages} 页
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="tertiary"
          isDisabled={page <= 1}
          onPress={() => onChange(page - 1)}
        >
          上一页
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          isDisabled={page >= totalPages}
          onPress={() => onChange(page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}

export function LoadingPanel({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10">
      <LoadingState label={label} />
    </div>
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
    <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <Button
          size="sm"
          variant="tertiary"
          className="mt-3"
          onPress={onRetry}
        >
          重试
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
      {children}
    </div>
  )
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      {children}
    </div>
  )
}

export const TH_CLASS =
  'whitespace-nowrap border-b border-border px-3 py-2 text-left text-xs font-medium text-muted'
export const TD_CLASS = 'border-b border-separator px-3 py-2 align-middle'

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <Card className="mb-4 flex flex-wrap items-end gap-3">{children}</Card>
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
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  )
}