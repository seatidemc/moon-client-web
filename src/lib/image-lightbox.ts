import type { SlideData } from 'photoswipe'

import 'photoswipe/style.css'

/**
 * PhotoSwipe 需要图片的像素尺寸来换算缩放比例。未加载完成的图片自然尺寸为
 * 0，此时退回渲染尺寸；渲染尺寸同样保持原始宽高比，足以正常铺满。
 */
function dimensions(image: HTMLImageElement) {
  return {
    width: image.naturalWidth || image.clientWidth || 1200,
    height: image.naturalHeight || image.clientHeight || 800,
  }
}

/**
 * 打开图片预览，可在 `images` 之间滑动切换。`target` 必须是其中之一，
 * 它同时作为缩略图，用于放大和关闭时的位置动画。
 */
export async function openImageLightbox(
  images: HTMLImageElement[],
  target: HTMLImageElement,
) {
  const slides = images.filter((image) => image.src)
  const index = slides.indexOf(target)
  if (index === -1) return

  const dataSource: SlideData[] = slides.map((image) => ({
    src: image.currentSrc || image.src,
    alt: image.alt,
    element: image,
    ...dimensions(image),
  }))

  // 只在真正放大时加载 PhotoSwipe，避免把它带进其他页面的首屏包。
  const { default: PhotoSwipe } = await import('photoswipe')

  const lightbox = new PhotoSwipe({
    dataSource,
    index,
    bgOpacity: 0.9,
    showHideAnimationType: 'zoom',
  })

  lightbox.init()
}