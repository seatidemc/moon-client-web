import { cn } from '@heroui/react'
import type { CSSProperties } from 'react'

import { boardIconClassName } from '@/lib/board-icons'

interface BoardIconProps {
  icon: string
  color?: string
  className?: string
  style?: CSSProperties
  /** 图标字号，同时决定图标方块尺寸，默认继承当前字号。 */
  size?: string
}

/** 使用板块色渲染的板块图标。 */
export function BoardIcon({
  icon,
  color,
  className,
  style,
  size = '1em',
}: BoardIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('board-icon', boardIconClassName(icon), className)}
      style={{ color, fontSize: size, ...style }}
    />
  )
}