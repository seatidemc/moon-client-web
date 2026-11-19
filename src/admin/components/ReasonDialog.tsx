import { Button, Modal, TextArea } from '@heroui/react'
import { useEffect, useState } from 'react'

interface ReasonDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  /** 是否允许不填写原因 */
  reasonOptional?: boolean
  onConfirm: (reason: string) => void
}

/**
 * 需要填写操作原因的管理动作弹窗（删除主题/跟帖等），
 * 原因会写入后端审计日志。
 */
export function ReasonDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认删除',
  reasonOptional = true,
  onConfirm,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (isOpen) setReason('')
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭操作窗口" />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3">
              <p className="text-sm text-muted">{description}</p>
              <TextArea
                fullWidth
                rows={3}
                aria-label="操作原因"
                placeholder={
                  reasonOptional ? '操作原因（可选）' : '请输入操作原因'
                }
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                variant="danger"
                isDisabled={!reasonOptional && !reason.trim()}
                onPress={() => {
                  onConfirm(reason.trim())
                  onOpenChange(false)
                }}
              >
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}