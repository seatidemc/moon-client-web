import { formatDateTime } from '@/lib/utils'

export { formatDateTime }

const numberFormatter = new Intl.NumberFormat('zh-CN')

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}

export function formatDateTimeOrDash(value: string | null | undefined): string {
  return value ? formatDateTime(value) : '—'
}

export function formatJsonDetail(detail: unknown): string {
  if (detail === null || detail === undefined || detail === '') return '—'
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

export const LAB_ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  basic: '普通用户',
  operator: '运营',
  superuser: '超级管理员',
}

export function labRoleLabel(role: string): string {
  return LAB_ROLE_LABELS[role] ?? role
}

export const BOARD_ICON_OPTIONS = [
  { value: 'discussion', label: '讨论' },
  { value: 'code', label: '代码' },
  { value: 'life', label: '生活' },
  { value: 'feedback', label: '反馈' },
]

export const UPLOAD_KIND_LABELS: Record<string, string> = {
  post: '主题/跟帖',
  avatar: '头像',
  background: '主页背景',
}

export function uploadKindLabel(kind: string): string {
  return UPLOAD_KIND_LABELS[kind] ?? kind
}

/** 把 datetime-local 的值转换为后端要求的 RFC3339。 */
export function toRfc3339(localValue: string): string | undefined {
  if (!localValue) return undefined
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

export function boardScopeLabel(boardId: number | null, boardNames: Map<number, string>): string {
  if (boardId === null) return '全局'
  return boardNames.get(boardId) ?? `板块 #${boardId}`
}