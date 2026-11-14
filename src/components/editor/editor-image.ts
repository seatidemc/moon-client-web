import type { NodeViewRenderer } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import Image from '@tiptap/extension-image'

import { IMAGE_RESIZE_MIN_SIZE } from './editor-constants'
import type { ImageAlignment } from './editor-types'

/** All eight handles; corners are the visible dots, edges are bigger hit areas. */
const RESIZE_DIRECTIONS = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

/**
 * `ResizableNodeView` 没有暴露按节点切换比例锁定的入口，这里只用到它的
 * 两个运行时字段。字段消失时最坏退化为按当前显示尺寸缩放，不影响编辑。
 */
interface AspectRatioInternals {
  preserveAspectRatio: boolean
  aspectRatio: number
  handleResizeStart: (event: MouseEvent | TouchEvent, direction: string) => void
}

function readAlignment(element: HTMLElement): ImageAlignment {
  const align = element.getAttribute('data-align')
  return align === 'center' || align === 'right' ? align : 'left'
}

function dimensionStyle(value: unknown) {
  const dimension = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(dimension) && dimension > 0 ? `${dimension}px` : ''
}

function imageElementAt(dom: HTMLElement) {
  return dom instanceof HTMLImageElement ? dom : dom.querySelector('img')
}

function syncImageSize(dom: HTMLElement, attrs: Record<string, unknown>) {
  const image = imageElementAt(dom)
  if (!image) return

  image.style.width = dimensionStyle(attrs.width)
  image.style.height = dimensionStyle(attrs.height)
}

function isAspectLocked(node: ProseMirrorNode) {
  return node.attrs.lockAspect !== false
}

/**
 * Tiptap's Image with an alignment attribute. Alignment is stored as
 * `data-align` so both the editor node view and rendered posts can style it.
 */
export const ContextualImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: readAlignment,
        renderHTML: (attributes) => ({
          'data-align': attributes.align as ImageAlignment,
        }),
      },
      /**
       * 仅编辑器内的行为：拖拽和手动输入尺寸时是否保持原图比例。
       * 不写进 HTML，渲染出的帖子只关心最终的宽高。
       */
      lockAspect: {
        default: true,
        rendered: false,
      },
    }
  },

  /**
   * The stock image node view ignores width/height updates, so programmatic
   * resizing (and undoing it) would not refresh the rendered size. Re-apply
   * the attributes on every accepted node update.
   */
  addNodeView(): NodeViewRenderer | null {
    const parentNodeView = this.parent?.()
    if (!parentNodeView) return null

    return (props) => {
      const nodeView = parentNodeView(props)
      const originalUpdate = nodeView.update?.bind(nodeView)
      let current = props.node

      if (nodeView.dom instanceof HTMLElement) {
        const dom = nodeView.dom
        const internals = nodeView as unknown as AspectRatioInternals
        const startResize = internals.handleResizeStart

        // 未锁定比例时宽高可能已经失真，锁定后拖拽要从原图比例出发，
        // 而不是沿用 `ResizableNodeView` 在拖拽开始时量到的失真尺寸。
        internals.handleResizeStart = function (
          this: AspectRatioInternals,
          event,
          direction,
        ) {
          startResize.call(this, event, direction)

          if (!this.preserveAspectRatio) return
          const image = imageElementAt(dom)
          if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
            return
          }
          this.aspectRatio = image.naturalWidth / image.naturalHeight
        }

        internals.preserveAspectRatio = isAspectLocked(current)
        syncImageSize(dom, current.attrs)
      }

      nodeView.update = (node, decorations, innerDecorations) => {
        const accepted = originalUpdate
          ? originalUpdate(node, decorations, innerDecorations)
          : true

        if (accepted !== false && nodeView.dom instanceof HTMLElement) {
          current = node
          const updated = nodeView as unknown as AspectRatioInternals
          updated.preserveAspectRatio = isAspectLocked(node)
          syncImageSize(nodeView.dom, node.attrs)
        }
        return accepted
      }

      return nodeView
    }
  },
}).configure({
  allowBase64: true,
  resize: {
    enabled: true,
    directions: [...RESIZE_DIRECTIONS],
    minWidth: IMAGE_RESIZE_MIN_SIZE,
    minHeight: IMAGE_RESIZE_MIN_SIZE,
    // 按节点上的 lockAspect 决定，见上面的 node view。
    alwaysPreserveAspectRatio: false,
  },
})