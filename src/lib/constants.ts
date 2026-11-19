import type { Site } from '@/types'

/** 论坛 API 前缀；开发环境由 Vite 代理到后端。 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/forum-v1'

/** 前台默认分页大小。 */
export const PAGE_SIZE = 20

/** /site 尚未返回时的占位站点配置，与后端默认值一致。 */
export const DEFAULT_SITE: Site = {
  siteName: 'Tide',
  siteDescription: '一个简单的论坛。',
  announcement: '',
  footerText: '',
  allowGuestRead: true,
}