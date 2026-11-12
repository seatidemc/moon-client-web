import { Code } from 'pixelarticons/react/Code.js'
import { Coffee } from 'pixelarticons/react/Coffee.js'
import { Lightbulb } from 'pixelarticons/react/Lightbulb.js'
import { MessageText } from 'pixelarticons/react/MessageText.js'
import type { ComponentType, SVGProps } from 'react'

import type { BoardIconName } from '@/types'

type BoardIconComponent = ComponentType<SVGProps<SVGSVGElement>>

const BOARD_ICONS: Record<BoardIconName, BoardIconComponent> = {
  discussion: MessageText,
  code: Code,
  life: Coffee,
  feedback: Lightbulb,
}

const FALLBACK_ICON = MessageText

export const DEFAULT_BOARD_ICON: BoardIconName = 'discussion'
export const DEFAULT_BOARD_COLOR = '#6366f1'

export function isBoardIconName(value: unknown): value is BoardIconName {
  return typeof value === 'string' && value in BOARD_ICONS
}

export function getBoardIcon(
  icon: BoardIconName | undefined,
): BoardIconComponent {
  return isBoardIconName(icon) ? BOARD_ICONS[icon] : FALLBACK_ICON
}