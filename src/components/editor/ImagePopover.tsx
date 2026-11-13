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

import { IMAGE_POPUP_WIDTH } from './editor-constants'
import { filterImageFiles, insertImageFiles } from './editor-handlers'
import type { PopupPosition } from './editor-types'
import { normalizeImageSrc } from './editor-utils'

type ImageSource = 'url' | 'upload'

interface ImagePopoverProps {
  editor: Editor
  position: PopupPosition
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function ImagePopover({
  editor,
  position,
  panelRef,
  onClose,
}: ImagePopoverProps) {
  const [source, setSource] = useState<ImageSource>('url')
  const [srcInput, setSrcInput] = useState('')
  const [altInput, setAltInput] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const srcInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => srcInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  function insertImage() {
    const src = normalizeImageSrc(srcInput)
    if (!src) return

    const alt = altInput.trim()
    editor
      .chain()
      .focus()
      .setImage({ src, ...(alt ? { alt } : {}) })
      .run()
    onClose()
  }

  function insertFiles(files: File[]) {
    const images = filterImageFiles(files)
    if (images.length === 0) return

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
      if (srcInput.trim()) insertImage()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <Surface
      ref={panelRef}
      className="absolute z-30 rounded-xl border border-field-border p-2 shadow-lg"
      style={{
        left: position.left,
        top: position.top,
        width: IMAGE_POPUP_WIDTH,
      }}
      // 阻止把文件拖到浮窗空白处时浏览器打开文件。
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
    >
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
                placeholder="https://example.com/image.png"
              />
            </label>
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
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="min-w-0 truncate px-1 text-xs text-muted">
              插入图片
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" size="sm" variant="ghost" onPress={onClose}>
                取消
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                isDisabled={!srcInput.trim()}
                onPress={insertImage}
              >
                确定
              </Button>
            </div>
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
            <span className="text-xs text-muted">图片会内嵌到内容中保存</span>
          </button>
        </Tabs.Panel>
      </Tabs>
    </Surface>
  )
}