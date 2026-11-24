import { Button, Input, Modal, toast } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import { useCurrentBoardColor } from '@/lib/use-current-board-color'

export function LoginDialog() {
  const { loginDialogOpen, closeLogin } = useForum()

  return (
    <Modal
      isOpen={loginDialogOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) closeLogin()
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭登录窗口" />
            <LoginForm
              key={loginDialogOpen ? 'open' : 'closed'}
              onClose={closeLogin}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function LoginForm({ onClose }: { onClose: () => void }) {
  const { site, login } = useForum()
  const boardColor = useCurrentBoardColor()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (!identifier.trim() || !password) {
      toast.danger('请输入账号和密码。')
      return
    }

    setSubmitting(true)

    try {
      const nextError = await login(identifier, password)
      if (nextError) toast.danger(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <Modal.Header>
        <Modal.Heading className="brand-logo text-2xl tracking-tight">
          {site.siteName}
        </Modal.Heading>
      </Modal.Header>
      <Modal.Body className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="login-account" className="text-sm font-medium">
            账号
          </label>
          <Input
            id="login-account"
            fullWidth
            autoFocus
            autoComplete="username"
            placeholder="输入账号"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="login-password" className="text-sm font-medium">
            密码
          </label>
          <Input
            id="login-password"
            fullWidth
            type="password"
            autoComplete="current-password"
            placeholder="输入密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={onClose}>
          取消
        </Button>
        <PendingButton
          type="submit"
          variant="primary"
          isPending={submitting}
          style={getBoardThemeStyle(boardColor)}
        >
          登录
        </PendingButton>
      </Modal.Footer>
    </form>
  )
}