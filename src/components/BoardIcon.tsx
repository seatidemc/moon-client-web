import { createElement } from 'react'

import { getBoardIcon } from '@/lib/board-icons'
import type { BoardIconName } from '@/types'

interface BoardIconProps {
  icon: BoardIconName
  color: string
  className?: string
}

/** 使用板块色渲染的板块图标。 */
export function BoardIcon({ icon, color, className }: BoardIconProps) {
  return createElement(getBoardIcon(icon), {
    'aria-hidden': true,
    className,
    style: { color },
  })
}