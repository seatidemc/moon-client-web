import { Button } from '@heroui/react'
import { useNavigate } from 'react-router-dom'

import { usePageTitle } from '@/lib/use-page-title'

export function NotFoundPage() {
  const navigate = useNavigate()
  usePageTitle('页面不存在')

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-start px-4 py-20">
      <p className="text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        页面不存在
      </h1>
      <p className="mt-2 text-sm text-muted">
        你访问的页面可能已被删除，或者链接有误。
      </p>
      <Button
        variant="outline"
        className="mt-6"
        onPress={() => navigate('/boards')}
      >
        返回板块
      </Button>
    </main>
  )
}
