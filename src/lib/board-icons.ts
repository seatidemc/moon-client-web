import { BOARD_ICON_NAMES, type BoardIconName } from './board-icon-names'

export { BOARD_ICON_NAMES, type BoardIconName }

export const DEFAULT_BOARD_ICON: BoardIconName = 'message-text'
export const DEFAULT_BOARD_COLOR = '#6366f1'

const BOARD_ICON_NAME_SET: ReadonlySet<string> = new Set(BOARD_ICON_NAMES)

export function isBoardIconName(value: unknown): value is BoardIconName {
  return typeof value === 'string' && BOARD_ICON_NAME_SET.has(value)
}

export function normalizeBoardIcon(icon: string | undefined): BoardIconName {
  return isBoardIconName(icon) ? icon : DEFAULT_BOARD_ICON
}

/** 板块图标使用 pixelarticons 字体，类名即图标名。 */
export function boardIconClassName(icon: string): string {
  return `pixelart-icons-font-${normalizeBoardIcon(icon)}`
}