const MAX_IMAGE_DIMENSION = 1920
const MAX_SOURCE_BYTES = 12 * 1024 * 1024

const AVATAR_MIN_DIMENSION = 64

export const AVATAR_OUTPUT_SIZE = 512

export const BACKGROUND_IMAGE_RULES = {
  minWidth: 1280,
  minHeight: 360,
  aspectRatio: { width: 16, height: 9 },
} as const

export interface LoadedImage {
  image: HTMLImageElement
  objectUrl: string
}

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

/**
 * Reads an image file for the avatar cropper. The returned object URL stays
 * alive so the dialog can preview the original image; callers must revoke it
 * once the image is no longer needed.
 */
export async function loadAvatarImage(file: File): Promise<LoadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件。')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('图片不能超过 12MB。')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)

    if (
      image.naturalWidth < AVATAR_MIN_DIMENSION ||
      image.naturalHeight < AVATAR_MIN_DIMENSION
    ) {
      throw new Error(
        `图片尺寸太小，至少需要 ${AVATAR_MIN_DIMENSION} × ${AVATAR_MIN_DIMENSION} 像素。`,
      )
    }

    return { image, objectUrl }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

/**
 * Crops a square region of an image and returns a square data URL suitable for
 * persisting in localStorage.
 */
export function cropImageToSquareDataUrl(
  image: HTMLImageElement,
  crop: { x: number; y: number; size: number },
  outputSize = AVATAR_OUTPUT_SIZE,
): string {
  const size = Math.min(
    crop.size,
    image.naturalWidth,
    image.naturalHeight,
  )
  const x = Math.min(Math.max(0, crop.x), image.naturalWidth - size)
  const y = Math.min(Math.max(0, crop.y), image.naturalHeight - size)

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法处理这张图片。')

  context.imageSmoothingQuality = 'high'
  context.drawImage(image, x, y, size, size, 0, 0, outputSize, outputSize)
  return canvas.toDataURL('image/webp', 0.88)
}
