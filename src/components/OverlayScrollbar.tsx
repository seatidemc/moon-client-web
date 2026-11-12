import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const IDLE_MS = 800
const PAGE_TRACK_INSET = 8
const ELEMENT_TRACK_INSET = 2
const EDGE_GAP = 2
const THUMB_THICKNESS = 6
const THUMB_MIN_LENGTH = 28

interface Thumb {
  /** 被滚动的元素；为 null 时表示页面本身 */
  target: HTMLElement | null
  axis: 'x' | 'y'
  left: number
  top: number
  width: number
  height: number
  /** 拖动一像素对应的滚动距离 */
  ratio: number
}

interface DragState {
  axis: 'x' | 'y'
  start: number
  scroll: number
  ratio: number
  target: HTMLElement | null
}

function trackThumb(
  viewport: number,
  content: number,
  offset: number,
  inset: number,
): { length: number; offset: number; ratio: number } | null {
  const overflow = content - viewport
  if (viewport <= 0 || overflow <= 1) return null

  const track = viewport - inset * 2
  if (track <= 0) return null

  const length = Math.min(
    track,
    Math.max(THUMB_MIN_LENGTH, (track * viewport) / content),
  )
  const span = Math.max(1, track - length)

  return {
    length,
    offset: inset + (span * offset) / overflow,
    ratio: overflow / span,
  }
}

function pageThumb(): Thumb | null {
  const { scrollHeight } = document.documentElement
  const viewport = window.innerHeight
  const track = trackThumb(
    viewport,
    scrollHeight,
    window.scrollY,
    PAGE_TRACK_INSET,
  )
  if (!track) return null

  return {
    target: null,
    axis: 'y',
    left: window.innerWidth - EDGE_GAP - THUMB_THICKNESS,
    top: track.offset,
    width: THUMB_THICKNESS,
    height: track.length,
    ratio: track.ratio,
  }
}

/** 只有真正的滚动容器才能被拖动，溢出但不可滚动的元素不参与命中。 */
function scrollsOn(element: HTMLElement, axis: 'x' | 'y') {
  const style = getComputedStyle(element)
  const overflow = axis === 'x' ? style.overflowX : style.overflowY

  return overflow === 'auto' || overflow === 'scroll'
}

function elementThumb(element: HTMLElement): Thumb | null {
  const rect = element.getBoundingClientRect()
  if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null
  if (rect.right <= 0 || rect.left >= window.innerWidth) return null

  const innerTop = rect.top + element.clientTop
  const innerLeft = rect.left + element.clientLeft
  const innerRight = innerLeft + element.clientWidth
  const innerBottom = innerTop + element.clientHeight

  const vertical = scrollsOn(element, 'y')
    ? trackThumb(
        element.clientHeight,
        element.scrollHeight,
        element.scrollTop,
        ELEMENT_TRACK_INSET,
      )
    : null
  if (vertical) {
    return {
      target: element,
      axis: 'y',
      left: innerRight - EDGE_GAP - THUMB_THICKNESS,
      top: innerTop + vertical.offset,
      width: THUMB_THICKNESS,
      height: vertical.length,
      ratio: vertical.ratio,
    }
  }

  const horizontal = scrollsOn(element, 'x')
    ? trackThumb(
        element.clientWidth,
        element.scrollWidth,
        element.scrollLeft,
        ELEMENT_TRACK_INSET,
      )
    : null
  if (!horizontal) return null

  return {
    target: element,
    axis: 'x',
    left: innerLeft + horizontal.offset,
    top: innerBottom - EDGE_GAP - THUMB_THICKNESS,
    width: horizontal.length,
    height: THUMB_THICKNESS,
    ratio: horizontal.ratio,
  }
}

/** 全站滚动指示条，叠在内容之上，不占据布局宽度，滚动时出现。 */
export function OverlayScrollbar() {
  const [thumb, setThumb] = useState<Thumb | null>(null)
  const [visible, setVisible] = useState(false)
  const idle = useRef(0)
  const drag = useRef<DragState | null>(null)

  const reveal = useCallback(() => {
    setVisible(true)
    window.clearTimeout(idle.current)
    if (drag.current) return
    idle.current = window.setTimeout(() => setVisible(false), IDLE_MS)
  }, [])

  useEffect(() => {
    function onScroll(event: Event) {
      const { target } = event
      setThumb(
        target instanceof HTMLElement ? elementThumb(target) : pageThumb(),
      )
      reveal()
    }

    function onResize() {
      setThumb(null)
      setVisible(false)
    }

    // 内层元素的 scroll 不冒泡，只能在捕获阶段统一监听。
    document.addEventListener('scroll', onScroll, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
      window.clearTimeout(idle.current)
    }
  }, [reveal])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!thumb) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      axis: thumb.axis,
      start: thumb.axis === 'y' ? event.clientY : event.clientX,
      scroll: thumb.target
        ? thumb.axis === 'y'
          ? thumb.target.scrollTop
          : thumb.target.scrollLeft
        : window.scrollY,
      ratio: thumb.ratio,
      target: thumb.target,
    }
    reveal()
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return

    const pointer = state.axis === 'y' ? event.clientY : event.clientX
    const scroll = state.scroll + (pointer - state.start) * state.ratio
    if (!state.target) {
      window.scrollTo(0, scroll)
    } else if (state.axis === 'y') {
      state.target.scrollTop = scroll
    } else {
      state.target.scrollLeft = scroll
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return

    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    reveal()
  }

  if (!thumb) return null

  return (
    <div
      aria-hidden
      className="fixed z-[100002] rounded-full bg-foreground/25 transition-[opacity,background-color] duration-200 hover:bg-foreground/45 touch-none"
      style={{
        left: thumb.left,
        top: thumb.top,
        width: thumb.width,
        height: thumb.height,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
}
