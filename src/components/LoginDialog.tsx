import { Button, Input, Modal } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { useForum } from '@/lib/forum-context'

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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const nextError = await login(identifier, password)
      if (nextError) setError(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <Modal.Header>
        <Modal.Heading>登录 {site.siteName}</Modal.Heading>
        <p className="text-sm text-muted">
          登录后即可发帖、回复和点赞。{site.siteName} 目前不开放注册。
        </p>
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

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={onClose}>
          取消
        </Button>
        <Button type="submit" variant="primary" isDisabled={submitting}>
          登录
        </Button>
      </Modal.Footer>
    </form>
  )
}