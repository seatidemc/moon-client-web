import { API_BASE } from '@/lib/constants'

/**
 * API 的源。开发环境 `API_BASE` 是相对路径，由 Vite 代理同源提供，
 * 此时不需要也不能补前缀。
 */
const API_ORIGIN = /^https?:\/\//i.test(API_BASE)
  ? new URL(API_BASE).origin
  : null

/**
 * 上传文件（正文图片、头像、主页背景）由后端以 `/forum-v1/files/...`
 * 相对路径返回。生产环境前端与 API 不同源，直接渲染会请求到前端站点并
 * 命中 SPA 回退；渲染媒体时需要补上 API 的源。
 */
export function mediaUrl(url: string): string {
  if (!API_ORIGIN || !url.startsWith('/') || url.startsWith('//')) return url

  return `${API_ORIGIN}${url}`
}