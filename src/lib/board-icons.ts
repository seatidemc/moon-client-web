import {
  Code2,
  Coffee,
  Lightbulb,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react'

import type { BoardIconName } from '@/types'

const BOARD_ICONS: Record<BoardIconName, LucideIcon> = {
  discussion: MessagesSquare,
  code: Code2,
  life: Coffee,
  feedback: Lightbulb,
}

const FALLBACK_ICON = MessagesSquare

export const DEFAULT_BOARD_ICON: BoardIconName = 'discussion'
export const DEFAULT_BOARD_COLOR = '#6366f1'

export function isBoardIconName(value: unknown): value is BoardIconName {
  return typeof value === 'string' && value in BOARD_ICONS
}

export function getBoardIcon(icon: BoardIconName | undefined): LucideIcon {
  return isBoardIconName(icon) ? BOARD_ICONS[icon] : FALLBACK_ICON
}