import type { Site } from '@/types'

/** 论坛 API 前缀；开发环境由 Vite 代理到后端。 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/forum-v1'

/** 前台默认分页大小。 */
export const PAGE_SIZE = 20

/** 主题列表（首页、板块页）的分页大小：首屏 10 条，其余下滑加载。 */
export const THREAD_LIST_PAGE_SIZE = 10

/** 用户主页主题/回复列表的分页大小。 */
export const USER_LIST_PAGE_SIZE = 5

/** /site 尚未返回时的占位站点配置，与后端默认值一致。 */
export const DEFAULT_SITE: Site = {
  siteName: 'Tide',
  siteDescription: '',
  announcement: '',
  footerText: '',
  allowGuestRead: true,
}