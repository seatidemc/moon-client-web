import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const IDLE_MS = 800
const TRACK_INSET = 8
const THUMB_MIN_LENGTH = 28

interface Thumb {
  length: number
  offset: number
}

interface DragState {
  y: number
  scroll: number
  ratio: number
}

/** 页面滚动指示条，叠在内容之上，不占据布局宽度。 */
export function OverlayScrollbar() {
  const [thumb, setThumb] = useState<Thumb | null>(null)
  const [visible, setVisible] = useState(false)
  const idle = useRef(0)
  const held = useRef(false)
  const drag = useRef<DragState | null>(null)

  const reveal = useCallback(() => {
    setVisible(true)
    window.clearTimeout(idle.current)
    if (held.current) return
    idle.current = window.setTimeout(() => setVisible(false), IDLE_MS)
  }, [])

  const measure = useCallback(() => {
    const { scrollHeight } = document.documentElement
    const viewport = window.innerHeight
    const overflow = scrollHeight - viewport

    if (overflow <= 1) {
      setThumb(null)
      return
    }

    const track = viewport - TRACK_INSET * 2
    const length = Math.max(
      THUMB_MIN_LENGTH,
      (track * viewport) / scrollHeight,
    )
    setThumb({
      length,
      offset: TRACK_INSET + ((track - length) * window.scrollY) / overflow,
    })
  }, [])

  useEffect(() => {
    function onScroll() {
      measure()
      reveal()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(document.documentElement)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
      window.clearTimeout(idle.current)
    }
  }, [measure, reveal])

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const overflow = document.documentElement.scrollHeight - window.innerHeight
    const span = window.innerHeight - TRACK_INSET * 2 - (thumb?.length ?? 0)
    if (overflow <= 0 || span <= 0) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    held.current = true
    drag.current = {
      y: event.clientY,
      scroll: window.scrollY,
      ratio: overflow / span,
    }
    reveal()
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    window.scrollTo(0, state.scroll + (event.clientY - state.y) * state.ratio)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return

    drag.current = null
    held.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    reveal()
  }

  if (!thumb) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 end-0 z-50 hidden w-2 [@media(hover:hover)]:block"
    >
      <div
        className="absolute end-0.5 w-1.5 rounded-full bg-foreground/25 transition-[opacity,background-color] duration-200 hover:bg-foreground/45 touch-none"
        style={{
          top: thumb.offset,
          height: thumb.length,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerEnter={() => {
          held.current = true
          reveal()
        }}
        onPointerLeave={() => {
          if (drag.current) return
          held.current = false
          reveal()
        }}
      />
    </div>
  )
}
