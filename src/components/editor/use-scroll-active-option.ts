import { useEffect, type RefObject } from 'react'

/**
 * Keeps the active listbox option visible. The suggestion panels never take
 * focus (the editor owns it and forwards arrow keys), so react-aria cannot
 * scroll the keyboard-selected option into view on its own.
 */
export function useScrollActiveOption(
  containerRef: RefObject<HTMLElement | null>,
  activeIndex: number,
  items: readonly unknown[],
) {
  useEffect(() => {
    const container = containerRef.current
    const item = container
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      .item(activeIndex)

    if (items[activeIndex] === undefined || !container || !item) return

    const containerRect = container.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()

    if (itemRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - itemRect.top
    } else if (itemRect.bottom > containerRect.bottom) {
      container.scrollTop += itemRect.bottom - containerRect.bottom
    }
  }, [activeIndex, containerRef, items])
}