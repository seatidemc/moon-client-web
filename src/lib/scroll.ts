import { cancelPulse, pulseElement } from './pulse'

let pendingNavigation: (() => void) | null = null

function cancelScrollEffect() {
  pendingNavigation?.()
  pendingNavigation = null
  cancelPulse()
}

function waitForScrollEnd(callback: () => void) {
  const startedAt = performance.now()
  let lastScrollY = window.scrollY
  let stableFrames = 0
  let frame = 0
  let timeout = 0
  let done = false

  function stop() {
    done = true
    cancelAnimationFrame(frame)
    window.clearTimeout(timeout)
    window.removeEventListener('scrollend', finish)
  }

  function finish() {
    if (done) return
    stop()
    callback()
  }

  function tick() {
    const scrollY = window.scrollY

    if (Math.abs(scrollY - lastScrollY) < 0.5) {
      stableFrames += 1
    } else {
      stableFrames = 0
      lastScrollY = scrollY
    }

    if (stableFrames >= 4 && performance.now() - startedAt >= 100) {
      finish()
      return
    }

    frame = requestAnimationFrame(tick)
  }

  window.addEventListener('scrollend', finish)
  timeout = window.setTimeout(finish, 2000)
  frame = requestAnimationFrame(tick)

  return stop
}

/**
 * Smooth-scrolls to the target element and pulses it once the scroll settles,
 * matching the behavior of clicking an item in the thread table of contents.
 */
export function scrollToAndEmphasize(id: string) {
  cancelScrollEffect()

  const target = document.getElementById(id)
  if (!target) return

  const scrollMargin =
    Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0

  if (Math.abs(target.getBoundingClientRect().top - scrollMargin) < 2) {
    pulseElement(target)
    return
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' })

  pendingNavigation = waitForScrollEnd(() => {
    pendingNavigation = null
    pulseElement(target)
  })
}

/**
 * Smoothly brings an element fully into the part of the viewport that the
 * overlay element (the sticky reply composer) does not cover. A just-posted
 * reply is scrolled this way so the page glides to it and it settles above the
 * composer instead of sliding underneath it. Elements that are already fully
 * visible are left alone, so the page never shifts under the composer.
 */
export function scrollIntoViewAbove(
  element: HTMLElement,
  overlay: HTMLElement | null,
) {
  const coveredHeight = overlay?.offsetHeight ?? 0
  const usableHeight = Math.max(0, window.innerHeight - coveredHeight)
  const rect = element.getBoundingClientRect()

  if (rect.top >= 0 && rect.bottom <= usableHeight) return

  window.scrollTo({
    top:
      rect.height <= usableHeight
        ? rect.top + window.scrollY + rect.height / 2 - usableHeight / 2
        : rect.top + window.scrollY,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}