import { Button, Input, toast } from '@heroui/react'
import { useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'

import { useAdmin } from '../store'

export function LoginPage() {
  const { login } = useAdmin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (!username.trim() || !password) {
      toast.danger('请输入账号和密码。')
      return
    }

    setSubmitting(true)
    try {
      const nextError = await login(username.trim(), password)
      if (nextError) toast.danger(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-surface p-5"
        >
          <p className="brand-logo text-2xl tracking-tight">Tide</p>

          <div className="space-y-1.5">
            <label htmlFor="admin-account" className="text-sm font-medium">
              管理员账号
            </label>
            <Input
              id="admin-account"
              fullWidth
              autoFocus
              autoComplete="username"
              placeholder="输入账号"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-sm font-medium">
              密码
            </label>
            <Input
              id="admin-password"
              fullWidth
              type="password"
              autoComplete="current-password"
              placeholder="输入密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <PendingButton
            type="submit"
            variant="primary"
            className="w-full"
            isPending={submitting}
          >
            登录管理后台
          </PendingButton>
        </form>
      </div>
    </div>
  )
}

export function AccessDeniedPage() {
  const { errorMessage, logout } = useAdmin()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center">
        <h1 className="text-lg font-semibold">无管理权限</h1>
        <p className="mt-2 text-sm text-muted">
          {errorMessage || '当前账号没有登录管理后台的权限。'}
        </p>
        <Button
          variant="tertiary"
          className="mt-4"
          onPress={() => void logout()}
        >
          退出管理后台
        </Button>
      </div>
    </div>
  )
}

export function ServiceErrorPage() {
  const { errorMessage, retry, logout } = useAdmin()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center">
        <h1 className="text-lg font-semibold">无法读取管理状态</h1>
        <p className="mt-2 text-sm text-danger">{errorMessage}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="tertiary" onPress={retry}>
            重试
          </Button>
          <Button variant="tertiary" onPress={() => void logout()}>
            退出管理后台
          </Button>
        </div>
      </div>
    </div>
  )
}