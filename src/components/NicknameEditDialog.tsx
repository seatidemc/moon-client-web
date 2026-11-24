import { Button, Input, Modal, toast } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'
import { useUpdateProfile } from '@/lib/queries'
import type { UserSummary } from '@/types'

interface NicknameEditDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  user: UserSummary
}

export function NicknameEditDialog({
  isOpen,
  onOpenChange,
  user,
}: NicknameEditDialogProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭昵称编辑" />
            <NicknameEditPanel
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

function NicknameEditPanel({
  user,
  onClose,
}: {
  user: UserSummary
  onClose: () => void
}) {
  const updateProfile = useUpdateProfile()
  const [nickname, setNickname] = useState(user.nickname ?? '')
  const trimmed = nickname.trim()
  const unchanged = trimmed === (user.nickname ?? '').trim()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (updateProfile.isPending) return

    if (unchanged) {
      onClose()
      return
    }

    try {
      // 留空表示不设置昵称，展示名回退到 username。
      await updateProfile.mutateAsync({ nickname: trimmed || null })
      toast.success('昵称已更新。')
      onClose()
    } catch {
      // 错误提示由 API 层展示，保留输入内容方便重试。
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <Modal.Header>
        <Modal.Heading>编辑昵称</Modal.Heading>
      </Modal.Header>

      <Modal.Body>
        <Input
          fullWidth
          autoFocus
          maxLength={32}
          aria-label="新的昵称"
          placeholder="新的昵称"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
        />
      </Modal.Body>

      <Modal.Footer>
        <Button
          type="button"
          variant="tertiary"
          isDisabled={updateProfile.isPending}
          onPress={onClose}
        >
          取消
        </Button>
        <PendingButton
          type="submit"
          variant="primary"
          isPending={updateProfile.isPending}
        >
          确定
        </PendingButton>
      </Modal.Footer>
    </form>
  )
}