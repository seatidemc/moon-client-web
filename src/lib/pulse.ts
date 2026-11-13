const PULSE_DURATION = 220

let activePulse: Animation | null = null

/**
 * Briefly scales an element up and back to draw attention to it. This is the
 * emphasis used by post cards when navigating to a floor, reused anywhere a
 * short-lived highlight is needed.
 */
export function pulseElement(element: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const animation = element.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.08)', offset: 0.5 },
      { transform: 'scale(1)' },
    ],
    { duration: PULSE_DURATION, easing: 'ease-in-out' },
  )

  activePulse = animation
  animation.addEventListener('finish', () => {
    if (activePulse === animation) activePulse = null
  })
}

export function cancelPulse() {
  activePulse?.cancel()
  activePulse = null
}