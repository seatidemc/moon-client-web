import { Link } from 'react-router-dom'

import { SITE_NAME } from '@/lib/constants'

const COPYRIGHT_YEAR = new Date().getFullYear()

/** 全站页脚：深灰底，左侧品牌标识与版权信息。 */
export function SiteFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-400">
      <div className="mx-auto flex w-full max-w-[69.25rem] flex-col gap-3 px-4 py-8">
        <Link
          to="/"
          aria-label={`${SITE_NAME} 首页`}
          className="text-zinc-50 transition-colors hover:text-white"
        >
          <span className="brand-logo text-2xl tracking-tight">{SITE_NAME}</span>
        </Link>

        <p className="text-sm leading-relaxed">
          {SITE_NAME} 是一个供 Minecraft 玩家交流的论坛网站。
        </p>

        <p className="text-xs">
          © {COPYRIGHT_YEAR} {SITE_NAME}. 保留所有权利。
        </p>
      </div>
    </footer>
  )
}