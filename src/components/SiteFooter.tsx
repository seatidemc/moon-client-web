import { Link } from 'react-router-dom'

import { useForum } from '@/lib/forum-context'

const COPYRIGHT_YEAR = new Date().getFullYear()

/** 全站页脚：深灰底，左侧品牌标识与版权信息。 */
export function SiteFooter() {
  const { site } = useForum()

  return (
    <footer className="bg-zinc-900 text-zinc-400">
      <div className="mx-auto flex w-full max-w-[69.25rem] flex-col gap-3 px-4 py-8">
        <Link
          to="/"
          aria-label={`${site.siteName} 首页`}
          className="text-zinc-50 transition-colors hover:text-white"
        >
          <span className="brand-logo text-2xl tracking-tight">
            {site.siteName}
          </span>
        </Link>

        <p className="text-sm leading-relaxed">{site.siteDescription}</p>

        {site.footerText ? (
          <p className="text-sm leading-relaxed">{site.footerText}</p>
        ) : null}

        <p className="text-xs">
          © {COPYRIGHT_YEAR} {site.siteName}. 保留所有权利。
        </p>
      </div>
    </footer>
  )
}