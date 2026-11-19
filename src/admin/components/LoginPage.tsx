import { Button, Input } from '@heroui/react'
import { ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAdmin } from '../store'

export function LoginPage() {
  const { login } = useAdmin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const nextError = await login(username.trim(), password)
      if (nextError) setError(nextError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Moon 管理后台
            </p>
            <p className="text-xs text-muted">论坛运营与内容审核</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-border bg-surface p-5"
        >
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

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isDisabled={submitting}
          >
            登录管理后台
          </Button>

          <p className="text-center text-xs text-muted">
            管理后台使用独立登录态，与论坛前台互不影响。
          </p>
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