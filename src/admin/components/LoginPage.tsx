import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Label,
  TextField,
  Typography,
  toast,
} from '@heroui/react'
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
      <Card className="w-full max-w-sm">
        <Card.Content>
          <Form onSubmit={handleSubmit} className="space-y-4">
            <p className="brand-logo text-2xl tracking-tight">Moon</p>

            <TextField fullWidth>
              <Label>管理员账号</Label>
              <Input
                autoFocus
                autoComplete="username"
                placeholder="输入账号"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </TextField>

            <TextField fullWidth>
              <Label>密码</Label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="输入密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </TextField>

<PendingButton
              type="submit"
              variant="primary"
              className="w-full"
              isPending={submitting}
            >
              登录管理后台
            </PendingButton>
          </Form>
        </Card.Content>
      </Card>
    </div>
  )
}

export function AccessDeniedPage() {
  const { errorMessage, logout } = useAdmin()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <Card.Content className="items-center text-center">
          <Typography.Heading level={1} className="text-lg font-semibold">
            无管理权限
          </Typography.Heading>
          <Typography.Paragraph size="sm" color="muted" className="mt-2">
            {errorMessage || '当前账号没有登录管理后台的权限。'}
          </Typography.Paragraph>
          <Button
            variant="tertiary"
            className="mt-4"
            onPress={() => void logout()}
          >
            退出管理后台
          </Button>
        </Card.Content>
      </Card>
    </div>
  )
}

export function ServiceErrorPage() {
  const { errorMessage, retry, logout } = useAdmin()

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <Card.Content className="items-center text-center">
          <Typography.Heading level={1} className="text-lg font-semibold">
            无法读取管理状态
          </Typography.Heading>
          <Alert status="danger" className="mt-2 w-full text-left">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{errorMessage}</Alert.Description>
            </Alert.Content>
          </Alert>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="tertiary" onPress={retry}>
              重试
            </Button>
            <Button variant="tertiary" onPress={() => void logout()}>
              退出管理后台
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}