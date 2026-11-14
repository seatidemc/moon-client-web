import { useEffect, useRef, type RefObject } from 'react'

interface DismissOnOutsideOptions {
  active: boolean
  /** 点击这些元素内部时不关闭 */
  ignoreRefs: ReadonlyArray<RefObject<HTMLElement | null>>
  onDismiss: () => void
  /** Esc 关闭后恢复焦点 */
  onEscape?: () => void
  /** 页面或编辑器滚动时也关闭，菜单自身滚动不受影响 */
  dismissOnScroll?: boolean
}

/**
 * Closes a floating panel when the user clicks outside it or presses Escape.
 * Escape is captured so it does not also close the surrounding dialog.
 */
export function useDismissOnOutside({
  active,
  ignoreRefs,
  onDismiss,
  onEscape,
  dismissOnScroll = false,
}: DismissOnOutsideOptions) {
  const latest = useRef({ ignoreRefs, onDismiss, onEscape })

  useEffect(() => {
    latest.current = { ignoreRefs, onDismiss, onEscape }
  })

  useEffect(() => {
    if (!active) return

    function isInside(target: Node | null) {
      return latest.current.ignoreRefs.some((ref) =>
        ref.current?.contains(target),
      )
    }

    function handlePointerDown(event: PointerEvent) {
      if (isInside(event.target as Node)) return
      latest.current.onDismiss()
    }

    function handleScroll(event: Event) {
      if (!dismissOnScroll || isInside(event.target as Node)) return
      // 键盘弹出等会让页面滚动；焦点仍在浮窗内时不关闭，避免打断输入。
      if (isInside(document.activeElement)) return
      latest.current.onDismiss()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return

      event.preventDefault()
      event.stopPropagation()
      latest.current.onDismiss()
      latest.current.onEscape?.()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    if (dismissOnScroll) {
      document.addEventListener('scroll', handleScroll, true)
    }
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      if (dismissOnScroll) {
        document.removeEventListener('scroll', handleScroll, true)
      }
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [active, dismissOnScroll])
}