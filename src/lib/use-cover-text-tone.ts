import { useEffect, useState } from 'react'

export type CoverTextTone = 'text-foreground' | 'text-background'

interface CoverTextTones {
  logo: CoverTextTone
  account: CoverTextTone
}

const DEFAULT_TONES: CoverTextTones = {
  logo: 'text-background',
  account: 'text-background',
}

const NAV_HEIGHT = 56
const COVER_HEIGHT_RATIO = 0.3
const CONTENT_MAX_WIDTH = 768
const CONTENT_GUTTER = 16
const SAMPLE_HEIGHT = 32
const LIGHT_THRESHOLD = 0.55
const DOWNSAMPLE_WIDTH = 480

/**
 * Samples the profile background behind the header text and picks a dark or
 * light tone so the logo and account name stay readable.
 */
export function useCoverTextTones(
  background: string | undefined,
): CoverTextTones {
  const [tones, setTones] = useState<CoverTextTones>(DEFAULT_TONES)

  useEffect(() => {
    if (!background) return

    let cancelled = false
    const image = new Image()

    function measure() {
      if (cancelled || !image.complete || !image.naturalWidth) return
      setTones(sampleTones(image))
    }

    image.onload = measure
    image.src = background

    window.addEventListener('resize', measure)
    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
    }
  }, [background])

  return tones
}

function sampleTones(image: HTMLImageElement): CoverTextTones {
  const viewportWidth = document.documentElement.clientWidth
  const boxHeight = window.innerHeight * COVER_HEIGHT_RATIO + NAV_HEIGHT
  const scale = Math.max(
    viewportWidth / image.naturalWidth,
    boxHeight / image.naturalHeight,
  )
  const offsetX = (viewportWidth - image.naturalWidth * scale) / 2
  const offsetY = (boxHeight - image.naturalHeight * scale) / 2

  const canvas = document.createElement('canvas')
  const downsample = Math.min(1, DOWNSAMPLE_WIDTH / image.naturalWidth)
  canvas.width = Math.max(1, Math.round(image.naturalWidth * downsample))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * downsample))

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return DEFAULT_TONES

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

  const contentWidth = Math.min(CONTENT_MAX_WIDTH, viewportWidth)
  const contentLeft = (viewportWidth - contentWidth) / 2
  const sampleTop = (NAV_HEIGHT - SAMPLE_HEIGHT) / 2

  function averageLuminance(left: number, right: number): number {
    let total = 0
    let count = 0
    const columns = 6
    const rows = 3

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = left + ((right - left) * (column + 0.5)) / columns
        const y = sampleTop + (SAMPLE_HEIGHT * (row + 0.5)) / rows
        const imageX = (x - offsetX) / scale
        const imageY = (y - offsetY) / scale
        const pixelX = clamp(
          Math.round(imageX * downsample),
          canvas.width - 1,
        )
        const pixelY = clamp(
          Math.round(imageY * downsample),
          canvas.height - 1,
        )
        const index = (pixelY * canvas.width + pixelX) * 4

        // Composite transparent pixels over the page background.
        const alpha = data[index + 3] / 255
        const red = data[index] * alpha + 255 * (1 - alpha)
        const green = data[index + 1] * alpha + 255 * (1 - alpha)
        const blue = data[index + 2] * alpha + 255 * (1 - alpha)

        total += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255
        count += 1
      }
    }

    return total / count
  }

  function toneFor(luminance: number): CoverTextTone {
    return luminance > LIGHT_THRESHOLD ? 'text-foreground' : 'text-background'
  }

  const logoLuminance = averageLuminance(
    contentLeft + CONTENT_GUTTER,
    contentLeft + CONTENT_GUTTER + 96,
  )
  const accountLuminance = averageLuminance(
    contentLeft + contentWidth - CONTENT_GUTTER - 140,
    contentLeft + contentWidth - CONTENT_GUTTER,
  )

  return {
    logo: toneFor(logoLuminance),
    account: toneFor(accountLuminance),
  }
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value))
}
