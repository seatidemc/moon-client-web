import type { Editor } from '@tiptap/core'
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

/** 补全图片地址省略的协议；允许 data:、schema 和站内相对路径。 */
export function normalizeImageSrc(value: string) {
  const src = value.trim()
  if (!src) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(src)) return src

  return `https://${src}`
}

/** 解析图片尺寸输入；空值或非法值返回 null（表示自动/原始大小）。 */
export function parseImageDimension(value: string) {
  const dimension = Number.parseInt(value.trim(), 10)
  return Number.isFinite(dimension) && dimension > 0 ? dimension : null
}

/**
 * 地址输入框只回填可编辑的外链。内嵌图片是 data URL，随图片大小可达数 MB，
 * 塞进输入框会让每次挂载/重渲染都阻塞好几秒，所以上传的图片不回填。
 */
export function editableImageSrc(src: string) {
  const value = src.trim()
  return /^data:/i.test(value) ? '' : value
}

/** 图片节点在编辑器里的 `<img>`；缩放 node view 会在外面包一层容器。 */
export function imageElementAt(view: Editor['view'], pos: number) {
  const dom = view.nodeDOM(pos)
  if (dom instanceof HTMLImageElement) return dom
  return dom instanceof HTMLElement ? dom.querySelector('img') : null
}

/**
 * 编辑器浮层的挂载点。弹窗里 React Aria 会把 dialog 之外的节点标成 inert，
 * 挂到遮罩层上浮层虽然可见却点不动，所以 Modal 内要挂进 dialog。
 */
export function floatingLayerContainer(view: Editor['view']) {
  return (
    view.dom.closest<HTMLElement>('[data-slot="modal-dialog"]') ?? document.body
  )
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