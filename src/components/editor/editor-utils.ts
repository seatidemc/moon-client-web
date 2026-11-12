import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

/** 匹配光标前刚输入的 re#楼层号（楼层号可以还没输入） */
export const REFERENCE_QUERY_PATTERN = /(?:^|[^\p{L}\p{N}_])(re#(\d*))$/u

/** 补全用户省略的协议，内部路径和锚点保持原样。 */
export function normalizeLinkHref(value: string) {
  const href = value.trim()
  if (!href) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return href

  return `https://${href}`
}

export function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

/** 文档是否含换行：多个顶层块、硬换行，或代码块里的换行。 */
export function hasDocLineBreak(doc: ProseMirrorNode) {
  if (doc.childCount > 1 || doc.textContent.includes('\n')) return true

  let hasHardBreak = false
  doc.descendants((node) => {
    if (node.type.name === 'hardBreak') hasHardBreak = true
    return !hasHardBreak
  })

  return hasHardBreak
}

/** 光标是否仍位于编辑器可视区域内。 */
export function isCaretInsidePanel(
  coords: { top: number; bottom: number },
  panelRect: DOMRect,
) {
  return coords.bottom >= panelRect.top && coords.top <= panelRect.bottom
}

/**
 * Places a popup next to the caret, switching above it when there is no room
 * below, and keeps it inside the editor panel.
 */
export function anchorPopup(
  coords: { left: number; top: number; bottom: number },
  panelRect: DOMRect,
  width: number,
  height: number,
  allowOutsidePanel = false,
): { left: number; top: number; above: boolean } {
  // 紧凑编辑器高度很小，浮窗需要允许越过编辑器上边缘。
  const aboveLimit = allowOutsidePanel ? 8 : panelRect.top
  const above =
    coords.bottom + height > window.innerHeight &&
    coords.top - height > aboveLimit
  const maxLeft = Math.max(8, panelRect.width - width - 8)

  return {
    left: Math.min(Math.max(coords.left - panelRect.left, 8), maxLeft),
    top: above
      ? coords.top - panelRect.top - 6
      : coords.bottom - panelRect.top + 6,
    above,
  }
}