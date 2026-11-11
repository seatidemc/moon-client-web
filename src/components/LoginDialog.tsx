import { Button, Input, Modal } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { DEMO_PASSWORD } from '@/lib/constants'
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
  const { users, login } = useForum()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const demoUsers = users.slice(0, 2)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextError = login(identifier, password)
    if (nextError) setError(nextError)
  }

  function fillDemo(handle: string) {
    setIdentifier(handle)
    setPassword(DEMO_PASSWORD)
    setError(null)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <Modal.Header>
        <Modal.Heading>登录 Moon</Modal.Heading>
        <p className="text-sm text-muted">
          登录后即可发帖和回复。Moon 目前不开放注册。
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

        <div className="rounded-lg bg-surface-secondary px-3 py-2.5">
          <p className="text-xs text-muted">
            演示账号（密码均为 {DEMO_PASSWORD}）
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {demoUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => fillDemo(user.handle)}
                className="rounded-md bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-default"
              >
                {user.name} · {user.handle}
              </button>
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={onClose}>
          取消
        </Button>
        <Button type="submit" variant="primary">
          登录
        </Button>
      </Modal.Footer>
    </form>
  )
}
