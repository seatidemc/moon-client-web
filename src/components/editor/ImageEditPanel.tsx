import type { Editor } from '@tiptap/core'
import { Button, Checkbox, Input } from '@heroui/react'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'

import { applyImageAspectLock, applyImageSize } from './editor-commands'
import { IMAGE_RESIZE_MIN_SIZE } from './editor-constants'
import { imageElementAt, parseImageDimension } from './editor-utils'

interface ImageEditPanelProps {
  editor: Editor
  /** 图片节点在文档中的位置 */
  pos: number
  /** 切换到替换图片来源的界面 */
  onReplace: () => void
  onClose: () => void
}

/** 原图宽高比；图片还没加载出来时是 null。 */
function readImageRatio(editor: Editor, pos: number) {
  const image = imageElementAt(editor.view, pos)
  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return null
  }

  return image.naturalWidth / image.naturalHeight
}

/** 只回填节点上的显式尺寸；没有显式值时留空，交给浏览器按自动处理。 */
function dimensionValue(value: unknown) {
  const dimension = parseImageDimension(String(value ?? ''))
  return dimension === null ? '' : String(dimension)
}

/**
 * Controls for an image that already exists in the document: replace its
 * source, edit the alt text, or change its size.
 */
export function ImageEditPanel({
  editor,
  pos,
  onReplace,
  onClose,
}: ImageEditPanelProps) {
  const node = editor.state.doc.nodeAt(pos)
  const [ratio, setRatio] = useState(() => readImageRatio(editor, pos))
  const [locked, setLocked] = useState(() => node?.attrs.lockAspect !== false)
  const [alt, setAlt] = useState(() => String(node?.attrs.alt ?? ''))
  const [widthInput, setWidthInput] = useState(() =>
    dimensionValue(node?.attrs.width),
  )
  const [heightInput, setHeightInput] = useState(() =>
    dimensionValue(node?.attrs.height),
  )

  useEffect(() => {
    if (node?.type.name !== 'image') onClose()
  }, [node, onClose])

  // 图片可能还没解码完，加载后才知道原图比例。
  useEffect(() => {
    if (ratio !== null) return

    const image = imageElementAt(editor.view, pos)
    if (!image) return

    const update = () => setRatio(readImageRatio(editor, pos))
    image.addEventListener('load', update)
    return () => image.removeEventListener('load', update)
  }, [editor, pos, ratio])

  /** 按原图比例把宽度换算成整组尺寸，最小边长与拖拽一致。 */
  function sizeFromWidth(width: number) {
    if (ratio === null) return null

    let nextWidth = Math.max(IMAGE_RESIZE_MIN_SIZE, width)
    let nextHeight = nextWidth / ratio
    if (nextHeight < IMAGE_RESIZE_MIN_SIZE) {
      nextHeight = IMAGE_RESIZE_MIN_SIZE
      nextWidth = nextHeight * ratio
    }

    return {
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
    }
  }

  function sizeFromHeight(height: number) {
    if (ratio === null) return null

    let nextHeight = Math.max(IMAGE_RESIZE_MIN_SIZE, height)
    let nextWidth = nextHeight * ratio
    if (nextWidth < IMAGE_RESIZE_MIN_SIZE) {
      nextWidth = IMAGE_RESIZE_MIN_SIZE
      nextHeight = nextWidth / ratio
    }

    return {
      width: Math.round(nextWidth),
      height: Math.round(nextHeight),
    }
  }

  function commitText() {
    editor
      .chain()
      .setNodeSelection(pos)
      .updateAttributes('image', {
        alt: alt.trim() || null,
      })
      .run()
  }

  function applyDimensions(
    width: number | null,
    height: number | null,
    attributes: Record<string, unknown> = {},
  ) {
    applyImageSize(editor, pos, width, height, attributes)
    setWidthInput(width === null ? '' : String(width))
    setHeightInput(height === null ? '' : String(height))
  }

  function changeWidth(value: string) {
    setWidthInput(value)

    if (!locked) return

    const width = parseImageDimension(value)
    const size = width === null ? null : sizeFromWidth(width)
    setHeightInput(size === null ? '' : String(size.height))
  }

  function changeHeight(value: string) {
    setHeightInput(value)

    if (!locked) return

    const height = parseImageDimension(value)
    const size = height === null ? null : sizeFromHeight(height)
    if (size) setWidthInput(String(size.width))
  }

  function changeLock(next: boolean) {
    setLocked(next)
    if (!next) {
      applyImageAspectLock(editor, pos, false)
      return
    }

    // 重新锁定：尺寸已偏离原图比例时，以当前宽度为主恢复比例。
    const image = imageElementAt(editor.view, pos)
    const width =
      image && image.offsetWidth > 0
        ? image.offsetWidth
        : parseImageDimension(String(node?.attrs.width ?? ''))
    const height =
      image && image.offsetHeight > 0
        ? image.offsetHeight
        : parseImageDimension(String(node?.attrs.height ?? ''))

    const size = width === null ? null : sizeFromWidth(width)
    if (
      size === null ||
      (height !== null &&
        Math.abs(size.width - width!) <= 1 &&
        Math.abs(size.height - height) <= 1)
    ) {
      applyImageAspectLock(editor, pos, true)
      return
    }

    applyDimensions(size.width, size.height, { lockAspect: true })
  }

  function applyCustomSize() {
    const width = parseImageDimension(widthInput)
    const height = parseImageDimension(heightInput)
    const storedWidth = parseImageDimension(String(node?.attrs.width ?? ''))
    const storedHeight = parseImageDimension(String(node?.attrs.height ?? ''))

    const widthChanged = width !== storedWidth
    const heightChanged = height !== storedHeight
    if (!widthChanged && !heightChanged) return

    if (!locked) {
      // 不锁定比例时两侧各自生效，留空的一侧交给浏览器自动。
      applyDimensions(width, height)
      return
    }

    // 锁定比例时以填写的一侧为准，另一侧按原图比例推算。
    const size =
      width !== null
        ? sizeFromWidth(width)
        : height !== null
          ? sizeFromHeight(height)
          : null
    if (size) applyDimensions(size.width, size.height)
    else applyDimensions(width, height)
  }

  function handleTextKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return

    if (event.key === 'Enter') {
      event.preventDefault()
      commitText()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  function handleSizeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return

    if (event.key === 'Enter') {
      event.preventDefault()
      applyCustomSize()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs text-muted">图片设置</span>
        <Button type="button" size="sm" variant="ghost" onPress={onReplace}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          替换
        </Button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="px-1 text-xs text-muted">替代文本</span>
        <Input
          fullWidth
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          onBlur={commitText}
          onKeyDown={handleTextKeyDown}
          aria-label="替代文本"
          placeholder="图片无法显示时的说明"
        />
      </label>

      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="px-1 text-xs text-muted">宽度（px）</span>
            <Input
              fullWidth
              type="number"
              min={1}
              inputMode="numeric"
              value={widthInput}
              onChange={(event) => changeWidth(event.target.value)}
              onKeyDown={handleSizeKeyDown}
              aria-label="图片宽度"
              placeholder="自动"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="px-1 text-xs text-muted">高度（px）</span>
            <Input
              fullWidth
              type="number"
              min={1}
              inputMode="numeric"
              value={heightInput}
              onChange={(event) => changeHeight(event.target.value)}
              onKeyDown={handleSizeKeyDown}
              aria-label="图片高度"
              placeholder="自动"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onPress={applyCustomSize}
          >
            应用
          </Button>
        </div>
        <Checkbox isSelected={locked} onChange={changeLock}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            锁定原始比例
          </Checkbox.Content>
        </Checkbox>
      </div>
    </div>
  )
}