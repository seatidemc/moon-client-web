import { Button, Modal, Slider, cn, toast } from '@heroui/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { useForum } from '@/lib/forum-context'
import {
  cropImageToSquareDataUrl,
  loadAvatarImage,
  type LoadedImage,
} from '@/lib/image'
import type { User } from '@/types'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const THUMBNAIL_SIZE = 80
const MIN_THUMBNAIL_SELECTION = 6

interface Point {
  x: number
  y: number
}

interface CropView {
  zoom: number
  offset: Point
}

interface AvatarCropDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  user: User
}

export function AvatarCropDialog({
  isOpen,
  onOpenChange,
  user,
}: AvatarCropDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭头像编辑" />
            <AvatarCropPanel
              key={isOpen ? 'open' : 'closed'}
              user={user}
              onClose={() => onOpenChange(false)}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/** Size of the image when it is drawn inside the square crop viewport. */
function getDisplaySize(
  image: HTMLImageElement,
  viewport: number,
  zoom: number,
) {
  const coverScale = Math.max(
    viewport / image.naturalWidth,
    viewport / image.naturalHeight,
  )
  const scale = coverScale * zoom

  return {
    scale,
    width: image.naturalWidth * scale,
    height: image.naturalHeight * scale,
  }
}

/** Keeps the image covering the viewport while it is dragged around. */
function clampOffset(
  offset: Point,
  displayWidth: number,
  displayHeight: number,
  viewport: number,
): Point {
  return {
    x: Math.min(0, Math.max(viewport - displayWidth, offset.x)),
    y: Math.min(0, Math.max(viewport - displayHeight, offset.y)),
  }
}

interface ThumbnailGeometry {
  width: number
  height: number
  left: number
  top: number
  size: number
}

/** Maps the square crop area onto a small preview of the whole image. */
function getThumbnailGeometry(
  image: HTMLImageElement,
  scale: number,
  viewport: number,
  offset: Point,
): ThumbnailGeometry {
  const thumbnailScale =
    THUMBNAIL_SIZE / Math.max(image.naturalWidth, image.naturalHeight)
  const size = Math.max(
    MIN_THUMBNAIL_SELECTION,
    (viewport / scale) * thumbnailScale,
  )

  return {
    width: image.naturalWidth * thumbnailScale,
    height: image.naturalHeight * thumbnailScale,
    left: (-offset.x / scale) * thumbnailScale,
    top: (-offset.y / scale) * thumbnailScale,
    size,
  }
}

/** Zooms while keeping the point at the viewport center in place. */
function zoomView(
  view: CropView,
  image: HTMLImageElement,
  viewport: number,
  nextZoom: number,
): CropView {
  if (viewport <= 0) return { ...view, zoom: nextZoom }

  const previous = getDisplaySize(image, viewport, view.zoom)
  const next = getDisplaySize(image, viewport, nextZoom)
  const ratio = next.scale / previous.scale

  return {
    zoom: nextZoom,
    offset: clampOffset(
      {
        x: viewport / 2 - (viewport / 2 - view.offset.x) * ratio,
        y: viewport / 2 - (viewport / 2 - view.offset.y) * ratio,
      },
      next.width,
      next.height,
      viewport,
    ),
  }
}

function AvatarCropPanel({
  user,
  onClose,
}: {
  user: User
  onClose: () => void
}) {
  const { updateUserAvatar } = useForum()
  const inputRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origin: Point
  } | null>(null)
  const disposedRef = useRef(false)
  const centeredRef = useRef<string | null>(null)

  const [source, setSource] = useState<LoadedImage | null>(null)
  const [viewport, setViewport] = useState(0)
  const [view, setView] = useState<CropView>({
    zoom: 1,
    offset: { x: 0, y: 0 },
  })
  const [dragging, setDragging] = useState(false)
  const [dropActive, setDropActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    disposedRef.current = false

    return () => {
      disposedRef.current = true
    }
  }, [])

  // The object URL stays alive while the cropper previews the original image.
  useEffect(() => {
    if (!source) return

    return () => URL.revokeObjectURL(source.objectUrl)
  }, [source])

  // Measure the viewport and center a freshly picked image inside it.
  useEffect(() => {
    const node = viewportRef.current
    if (!node || !source) return

    const { image, objectUrl } = source

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      const width = entry.contentRect.width
      setViewport(width)

      if (width <= 0 || centeredRef.current === objectUrl) return

      centeredRef.current = objectUrl
      const display = getDisplaySize(image, width, 1)
      setView({
        zoom: 1,
        offset: {
          x: (width - display.width) / 2,
          y: (width - display.height) / 2,
        },
      })
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [source])

  // React attaches wheel listeners passively, but zooming must prevent the page
  // from scrolling underneath the modal.
  useEffect(() => {
    const node = viewportRef.current
    if (!node || !source) return

    const image = source.image

    function handleWheel(event: WheelEvent) {
      event.preventDefault()

      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08

      setView((current) =>
        zoomView(
          current,
          image,
          viewport,
          Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.zoom * factor)),
        ),
      )
    }

    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [source, viewport])

  async function applyFile(file: File | undefined) {
    if (!file || processing) return

    setProcessing(true)
    setError(null)

    try {
      const next = await loadAvatarImage(file)

      if (disposedRef.current) {
        URL.revokeObjectURL(next.objectUrl)
        return
      }

      setSource(next)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : '无法读取这张图片。',
      )
    } finally {
      setProcessing(false)
    }
  }

  function openFilePicker() {
    if (processing) return

    inputRef.current?.click()
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDropActive(false)
    void applyFile(event.dataTransfer.files[0])
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!source || viewport <= 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: view.offset,
    }
    setDragging(true)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !source) return

    const display = getDisplaySize(source.image, viewport, view.zoom)

    setView((current) => ({
      ...current,
      offset: clampOffset(
        {
          x: drag.origin.x + event.clientX - drag.startX,
          y: drag.origin.y + event.clientY - drag.startY,
        },
        display.width,
        display.height,
        viewport,
      ),
    }))
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return

    dragRef.current = null
    setDragging(false)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!source || viewport <= 0) return

    const step = event.shiftKey ? 24 : 8
    const delta = {
      ArrowLeft: { x: step, y: 0 },
      ArrowRight: { x: -step, y: 0 },
      ArrowUp: { x: 0, y: step },
      ArrowDown: { x: 0, y: -step },
    }[event.key]

    if (!delta) return

    event.preventDefault()

    const display = getDisplaySize(source.image, viewport, view.zoom)

    setView((current) => ({
      ...current,
      offset: clampOffset(
        {
          x: current.offset.x + delta.x,
          y: current.offset.y + delta.y,
        },
        display.width,
        display.height,
        viewport,
      ),
    }))
  }

  function handleSave() {
    if (!source || viewport <= 0) return

    const { scale } = getDisplaySize(source.image, viewport, view.zoom)

    try {
      const avatarUrl = cropImageToSquareDataUrl(source.image, {
        x: -view.offset.x / scale,
        y: -view.offset.y / scale,
        size: viewport / scale,
      })

      updateUserAvatar(user.id, avatarUrl)
      toast.success('头像已更新。')
      onClose()
    } catch {
      setError('无法生成头像，请换一张图片试试。')
    }
  }

  function handleReset() {
    updateUserAvatar(user.id, null)
    toast.success('头像已删除。')
    onClose()
  }

  const display = source
    ? getDisplaySize(source.image, viewport, view.zoom)
    : null
  const thumbnail =
    source && display && viewport > 0 && display.scale > 0
      ? getThumbnailGeometry(
          source.image,
          display.scale,
          viewport,
          view.offset,
        )
      : null

  return (
    <>
      <Modal.Header>
        <Modal.Heading>更换头像</Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDropActive(true)
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center gap-3"
        >
          {source ? (
            <>
              <div
                ref={viewportRef}
                role="group"
                tabIndex={0}
                aria-label="头像裁剪区域：拖动图片调整位置，使用方向键微调"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={() => {
                  dragRef.current = null
                  setDragging(false)
                }}
                onKeyDown={handleKeyDown}
                className={cn(
                  'relative aspect-square w-full max-w-[24rem] touch-none overflow-hidden bg-surface select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                  dragging ? 'cursor-grabbing' : 'cursor-grab',
                )}
              >
                <img
                  src={source.objectUrl}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute top-0 left-0 max-w-none"
                  style={{
                    width: display?.width,
                    height: display?.height,
                    transform: `translate3d(${view.offset.x}px, ${view.offset.y}px, 0)`,
                  }}
                />

                {thumbnail ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-2.5 left-2.5 overflow-hidden rounded-sm border border-white/60 bg-black/30 shadow-md"
                    style={{
                      width: thumbnail.width,
                      height: thumbnail.height,
                    }}
                  >
                    <img
                      src={source.objectUrl}
                      alt=""
                      draggable={false}
                      className="block h-full w-full select-none"
                    />
                    <div
                      className="absolute border border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
                      style={{
                        left: thumbnail.left,
                        top: thumbnail.top,
                        width: thumbnail.size,
                        height: thumbnail.size,
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex w-full items-center justify-center gap-3">
                <span className="shrink-0 text-xs text-muted">缩放</span>
                <Slider
                  minValue={MIN_ZOOM}
                  maxValue={MAX_ZOOM}
                  step={0.01}
                  value={view.zoom}
                  onChange={(nextZoom) => {
                    const value = Array.isArray(nextZoom)
                      ? nextZoom[0]
                      : nextZoom

                    if (value === undefined) return

                    setView((current) =>
                      zoomView(current, source.image, viewport, value),
                    )
                  }}
                  aria-label="缩放图片"
                  className="w-40"
                >
                  <Slider.Track>
                    <Slider.Fill />
                    <Slider.Thumb />
                  </Slider.Track>
                </Slider>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted">
                  {Math.round(view.zoom * 100)}%
                </span>
              </div>
            </>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label="选择头像图片"
              aria-disabled={processing || undefined}
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openFilePicker()
                }
              }}
              className={cn(
                'flex aspect-square w-full max-w-[24rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
                'border border-dashed',
                dropActive
                  ? 'border-foreground bg-surface'
                  : 'border-border hover:bg-surface',
                processing && 'pointer-events-none opacity-60',
              )}
            >
              <ImagePlus
                className="size-5 text-muted"
                aria-hidden="true"
              />
              <span className="text-sm text-muted">拖拽或单击选择图片</span>
              <span className="text-xs text-muted">
                建议使用正方形图片，之后可以拖动和缩放裁剪
              </span>
            </div>
          )}

          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void applyFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      </Modal.Body>

      <Modal.Footer>
        {user.avatarUrl ? (
          <Button
            variant="ghost"
            className="mr-auto text-danger"
            onPress={handleReset}
          >
            <Trash2 aria-hidden="true" />
            删除头像
          </Button>
        ) : null}
        <Button variant="tertiary" onPress={onClose}>
          取消
        </Button>
        <Button
          variant="primary"
          isDisabled={!source || processing || viewport <= 0}
          onPress={handleSave}
        >
          保存
        </Button>
      </Modal.Footer>
    </>
  )
}