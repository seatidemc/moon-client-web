import { htmlToPlainText } from '@/lib/html-content'

export function makeExcerpt(html: string, maxLength = 120): string {
  const text = htmlToPlainText(html)
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSeconds >= 86400 * 7) return formatDate(isoDate)

  return formatTimeAgo(isoDate)
}

/**
 * Always-relative time, e.g. 3 天前 / 7 个月前 / 2 年前.
 */
export function formatTimeAgo(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diffSeconds < 60) return '刚刚'
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} 分钟前`
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} 小时前`

  const diffDays = Math.floor(diffSeconds / 86400)
  if (diffDays < 30) return `${diffDays} 天前`

  const months = monthsSince(date, new Date())
  if (months < 12) return `${months} 个月前`

  return `${Math.floor(months / 12)} 年前`
}

function monthsSince(from: Date, to: Date): number {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  if (to.getDate() < from.getDate()) months -= 1

  return Math.max(1, months)
}

export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const prefix = `${encodeURIComponent(name)}=`

  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length))
    }
  }

  return null
}

export function writeCookie(
  name: string,
  value: string,
  maxAgeSeconds = 60 * 60 * 24 * 365,
): void {
  if (typeof document === 'undefined') return

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
}
