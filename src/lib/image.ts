const MAX_IMAGE_DIMENSION = 1920
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

export const BACKGROUND_IMAGE_RULES = {
  minWidth: 1280,
  minHeight: 360,
  aspectRatio: { width: 16, height: 9 },
} as const

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('无法读取这张图片。'))
    image.src = src
  })
}

/**
 * Reads an uploaded image and returns a downscaled data URL, so profile
 * backgrounds stay small enough to persist in localStorage.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('图片不能超过 12MB。')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const { minWidth, minHeight, aspectRatio } = BACKGROUND_IMAGE_RULES

    if (image.naturalWidth < minWidth || image.naturalHeight < minHeight) {
      throw new Error(
        `图片尺寸太小，至少需要 ${minWidth} × ${minHeight} 像素。`,
      )
    }

    if (
      image.naturalWidth * aspectRatio.height <
      image.naturalHeight * aspectRatio.width
    ) {
      throw new Error(
        `请使用横向图片，宽高比不小于 ${aspectRatio.width}:${aspectRatio.height}。`,
      )
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    )
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法处理这张图片。')

    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/webp', 0.85)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
