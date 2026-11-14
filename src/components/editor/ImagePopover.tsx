import type { Editor } from '@tiptap/core'
import { Button, Input, Surface, Tabs, cn } from '@heroui/react'
import { Upload } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

import { replaceImageSource } from './editor-commands'
import {
  FLOATING_LAYER_Z_INDEX,
  IMAGE_POPUP_WIDTH,
} from './editor-constants'
import { ImageEditPanel } from './ImageEditPanel'
import { filterImageFiles, insertImageFiles } from './editor-handlers'
import type { ImagePopoverState } from './editor-types'
import {
  editableImageSrc,
  floatingLayerContainer,
  normalizeImageSrc,
  parseImageDimension,
  readImageFileAsDataUrl,
} from './editor-utils'

type ImageSource = 'url' | 'upload'
/** edit：调控选中的图片；replace：替换它的来源；insert：插入新图片。 */
type ImageMode = 'insert' | 'edit' | 'replace'

interface ImagePopoverProps {
  editor: Editor
  state: ImagePopoverState
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function ImagePopover({
  editor,
  state,
  panelRef,
  onClose,
}: ImagePopoverProps) {
  const imagePos = state.imagePos
  const currentSrc =
    imagePos === null
      ? ''
      : String(editor.state.doc.nodeAt(imagePos)?.attrs.src ?? '')
  // 上传的图片是内嵌 data URL；回填进输入框会卡住替换界面。
  const editableSrc = editableImageSrc(currentSrc)

  const [mode, setMode] = useState<ImageMode>(
    imagePos === null ? 'insert' : 'edit',
  )
  const [source, setSource] = useState<ImageSource>('url')
  const [srcInput, setSrcInput] = useState(editableSrc)
  const [altInput, setAltInput] = useState('')
  const [widthInput, setWidthInput] = useState('')
  const [heightInput, setHeightInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const srcInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit') return

    const frame = requestAnimationFrame(() => srcInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [mode])

  function applyImage() {
    const src = normalizeImageSrc(srcInput)
    if (!src) return

    if (mode === 'replace' && imagePos !== null) {
      replaceImageSource(editor, imagePos, src)
      onClose()
      return
    }

    const alt = altInput.trim()
    const width = parseImageDimension(widthInput)
    const height = parseImageDimension(heightInput)

    editor
      .chain()
      .focus()
      .setImage({
        src,
        ...(alt ? { alt } : {}),
        ...(width !== null ? { width } : {}),
        ...(height !== null ? { height } : {}),
      })
      .run()
    onClose()
  }

  function insertFiles(files: File[]) {
    const images = filterImageFiles(files)
    if (images.length === 0) return

    // 替换模式只取第一张图，原位替换来源。
    if (mode === 'replace' && imagePos !== null) {
      onClose()
      void readImageFileAsDataUrl(images[0])
        .then((src) => replaceImageSource(editor, imagePos, src))
        .catch(() => {
          // 读取失败时保留原图。
        })
      return
    }

    // 读取文件是异步的；先关闭浮窗并把焦点交回编辑器。
    onClose()
    editor.commands.focus()
    insertImageFiles(editor.view, images)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // 清空后才能再次选择同一个文件。
    event.target.value = ''
    insertFiles(files)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragOver(false)
    insertFiles(Array.from(event.dataTransfer.files))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (srcInput.trim()) applyImage()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  // 挂进弹窗的 dialog；挂遮罩层会被 React Aria 设为 inert，点不动。
  const container = floatingLayerContainer(editor.view)

  return createPortal(
    <Surface
      ref={panelRef}
      className="fixed rounded-xl border border-field-border p-2 shadow-lg"
      style={{
        left: state.left,
        top: state.top,
        width: IMAGE_POPUP_WIDTH,
        maxWidth: 'calc(100vw - 1rem)',
        zIndex: FLOATING_LAYER_Z_INDEX,
        pointerEvents: 'auto',
        transform: state.above ? 'translateY(-100%)' : undefined,
      }}
      // 阻止把文件拖到浮窗空白处时浏览器打开文件。
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
    >
      {mode === 'edit' && imagePos !== null ? (
        <ImageEditPanel
          key={imagePos}
          editor={editor}
          pos={imagePos}
          onReplace={() => {
            setSrcInput(editableSrc)
            setMode('replace')
          }}
          onClose={onClose}
        />
      ) : (
        <Tabs
          selectedKey={source}
          onSelectionChange={(key) =>
            setSource(key === 'upload' ? 'upload' : 'url')
          }
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="图片来源" className="w-full">
              <Tabs.Tab id="url" className="flex-1">
                外链
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="upload" className="flex-1">
                拖拽上传
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="url" className="mt-2 p-0">
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="px-1 text-xs text-muted">图片地址（必填）</span>
                <Input
                  ref={srcInputRef}
                  fullWidth
                  value={srcInput}
                  onChange={(event) => setSrcInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="图片地址"
                  placeholder={
                    mode === 'replace' && !editableSrc
                      ? '当前为上传的图片，输入外链地址替换'
                      : 'https://example.com/image.png'
                  }
                />
              </label>
              {mode === 'insert' ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="px-1 text-xs text-muted">替代文本</span>
                    <Input
                      fullWidth
                      value={altInput}
                      onChange={(event) => setAltInput(event.target.value)}
                      onKeyDown={handleKeyDown}
                      aria-label="替代文本"
                      placeholder="图片无法显示时的说明"
                    />
                  </label>
                  <div className="flex gap-2">
                    <label className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="px-1 text-xs text-muted">宽度（px）</span>
                      <Input
                        fullWidth
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={widthInput}
                        onChange={(event) => setWidthInput(event.target.value)}
                        onKeyDown={handleKeyDown}
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
                        onChange={(event) => setHeightInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="图片高度"
                        placeholder="自动"
                      />
                    </label>
                  </div>
                </>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={onClose}
              >
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                isDisabled={!srcInput.trim()}
                onPress={applyImage}
              >
                {mode === 'replace' ? '替换' : '确定'}
              </Button>
            </div>
          </Tabs.Panel>

          <Tabs.Panel id="upload" className="mt-2 p-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              aria-label="选择或拖拽图片"
              className={cn(
                'flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 text-center transition-colors',
                dragOver
                  ? 'border-foreground/40 bg-default'
                  : 'border-field-border hover:bg-default-soft',
              )}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="size-5 text-muted" aria-hidden="true" />
              <span className="text-xs text-foreground">
                点击选择，或拖拽图片到这里
              </span>
              <span className="text-xs text-muted">
                {mode === 'replace'
                  ? '图片会替换当前图片'
                  : '图片会内嵌到内容中保存'}
              </span>
            </button>
          </Tabs.Panel>
        </Tabs>
      )}
    </Surface>,
    container,
  )
}