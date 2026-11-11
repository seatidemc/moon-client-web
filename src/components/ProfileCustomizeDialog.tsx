import { Button, Modal, cn, toast } from '@heroui/react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'

import { useForum } from '@/lib/forum-context'
import { imageFileToDataUrl } from '@/lib/image'

interface ProfileCustomizeDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  userId: string
}

export function ProfileCustomizeDialog({
  isOpen,
  onOpenChange,
  userId,
}: ProfileCustomizeDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭个性化设置" />
            <CustomizePanel
              key={isOpen ? 'open' : 'closed'}
              userId={userId}
              onClose={() => onOpenChange(false)}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function CustomizePanel({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const { userBackgrounds, setUserBackground } = useForum()
  const background = userBackgrounds[userId]
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [processing, setProcessing] = useState(false)

  async function applyFile(file: File | undefined) {
    if (!file) return

    setProcessing(true)

    try {
      const updateBackground = imageFileToDataUrl(file).then((dataUrl) => {
        setUserBackground(userId, dataUrl)
      })

      toast.promise(updateBackground, {
        loading: '正在处理图片…',
        success: '主页背景已更新。',
        error: (cause) =>
          cause instanceof Error ? cause.message : '无法读取这张图片。',
      })

      await updateBackground
    } catch {
      // 错误信息已由 toast 展示。
    } finally {
      setProcessing(false)
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void applyFile(event.dataTransfer.files[0])
  }

  function openFilePicker() {
    if (processing) return

    inputRef.current?.click()
  }

  function handleRemove() {
    setUserBackground(userId, null)
  }

  return (
    <>
      <Modal.Header>
        <Modal.Heading>个性化</Modal.Heading>
      </Modal.Header>

      <Modal.Body className="space-y-2">
        <div className="flex h-9 items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">主页背景</h3>
          {background ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              onPress={handleRemove}
            >
              <Trash2 aria-hidden="true" />
              移除背景
            </Button>
          ) : null}
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label={background ? '更换主页背景' : '选择主页背景'}
          aria-disabled={processing || undefined}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              openFilePicker()
            }
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative mt-1 flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-4 py-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground',
            background
              ? 'border-0'
              : cn(
                  'border border-dashed',
                  dragging
                    ? 'border-foreground bg-surface'
                    : 'border-border hover:bg-surface',
                ),
            processing && 'pointer-events-none opacity-60',
          )}
        >
          {background ? (
            <>
              <img
                src={background}
                alt="主页背景预览"
                className="absolute inset-0 size-full object-cover"
              />
              <span className="relative rounded-full bg-background/70 px-3 py-1 text-xs text-foreground backdrop-blur-sm">
                单击或拖拽图片以更换
              </span>
            </>
          ) : (
            <>
              <ImagePlus className="size-5 text-muted" aria-hidden="true" />
              <span className="text-sm text-muted">拖拽或单击选择</span>
            </>
          )}

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
        <Button variant="tertiary" onPress={onClose}>
          完成
        </Button>
      </Modal.Footer>
    </>
  )
}
