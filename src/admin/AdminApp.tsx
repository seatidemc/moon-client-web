import {
  Button,
  Chip,
  EmptyState,
  Link,
  ScrollShadow,
  Typography,
  cn,
} from '@heroui/react'
import {
  ExternalLink,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquare,
  MessagesSquare,
  ScrollText,
  Settings,
  Users,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  Navigate,
  NavLink,
  Routes,
  Route,
} from 'react-router-dom'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { OverlayScrollbar } from '@/components/OverlayScrollbar'
import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'

import { AccessDeniedPage, LoginPage, ServiceErrorPage } from './components/LoginPage'
import { useAdmin, type AdminContextValue } from './store'
import { AuditPage } from './pages/AuditPage'
import { BoardsPage } from './pages/BoardsPage'
import { DashboardPage } from './pages/DashboardPage'
import { RepliesPage } from './pages/RepliesPage'
import { SettingsPage } from './pages/SettingsPage'
import { ThreadsPage } from './pages/ThreadsPage'
import { UploadsPage } from './pages/UploadsPage'
import { UsersPage } from './pages/UsersPage'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  visible: (admin: AdminContextValue) => boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: '数据看板',
    icon: LayoutDashboard,
    visible: (admin) => admin.canGlobal('stats.view'),
  },
  {
    to: '/threads',
    label: '主题管理',
    icon: MessagesSquare,
    visible: (admin) => admin.hasAnyScope('content.view_admin'),
  },
  {
    to: '/replies',
    label: '回复管理',
    icon: MessageSquare,
    visible: (admin) => admin.hasAnyScope('content.view_admin'),
  },
  {
    to: '/boards',
    label: '板块管理',
    icon: LayoutGrid,
    visible: () => true,
  },
  {
    to: '/users',
    label: '用户管理',
    icon: Users,
    visible: (admin) => admin.canGlobal('user.list'),
  },
  {
    to: '/uploads',
    label: '文件管理',
    icon: Image,
    visible: (admin) => admin.canGlobal('upload.manage'),
  },
  {
    to: '/settings',
    label: '站点设置',
    icon: Settings,
    visible: (admin) => admin.canGlobal('settings.manage'),
  },
  {
    to: '/audit',
    label: '审计日志',
    icon: ScrollText,
    visible: (admin) => admin.canGlobal('audit.view'),
  },
]

function homePathFor(admin: AdminContextValue): string {
  return (
    NAV_ITEMS.find((item) => item.visible(admin))?.to ?? '/boards'
  )
}

function NoPermissionPanel() {
  return (
    <EmptyState>
      <Typography.Heading level={2} className="text-base font-semibold">
        无权访问此页面
      </Typography.Heading>
      <Typography.Paragraph size="sm" color="muted" className="mt-1">
        当前管理员没有该功能所需的权限。
      </Typography.Paragraph>
    </EmptyState>
  )
}

function RouteGuard({
  permission,
  anyScope,
  children,
}: {
  permission?: string
  anyScope?: string
  children: ReactNode
}) {
  const admin = useAdmin()
  const allowed = permission
    ? admin.canGlobal(permission)
    : anyScope
      ? admin.hasAnyScope(anyScope)
      : true

  if (!allowed) return <NoPermissionPanel />
  return <>{children}</>
}

function AdminLayout() {
  const admin = useAdmin()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => item.visible(admin))
  const homePath = homePathFor(admin)

  return (
    <div className="flex min-h-svh bg-background text-foreground">
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <p className="brand-logo text-lg tracking-tight">Moon Admin</p>
        </div>

        <nav aria-label="管理导航" className="flex-1 space-y-0.5 p-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-default-soft hover:text-foreground',
                )
              }
            >
              <item.icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-default-soft hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            返回论坛前台
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <p className="brand-logo text-base tracking-tight lg:hidden">
                Moon Admin
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!admin.isSuperuser ? (
                <Chip size="sm" variant="soft" color="default">
                  <Chip.Label>板块管理员</Chip.Label>
                </Chip>
              ) : null}
              {admin.me.user ? (
                <span className="hidden items-center gap-2 sm:flex">
                  <UserAvatar user={admin.me.user} />
                  <span className="max-w-32 truncate text-sm">
                    {getDisplayName(admin.me.user)}
                  </span>
                </span>
              ) : null}
              <Button
                size="sm"
                variant="tertiary"
                aria-label="退出管理后台"
                onPress={() => setLogoutOpen(true)}
              >
                <LogOut className="size-4" aria-hidden="true" />
                退出
              </Button>
            </div>
          </div>

          <ScrollShadow
            orientation="horizontal"
            className="px-2 pb-2 lg:hidden"
          >
            <nav
              aria-label="管理导航（移动端）"
              className="flex gap-1"
            >
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                      isActive
                        ? 'bg-accent-soft text-accent'
                        : 'text-muted hover:bg-default-soft',
                    )
                  }
                >
                  <item.icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </ScrollShadow>
        </header>

        <main className="mx-auto w-full max-w-[84rem] flex-1 px-4 py-6">
          <Routes>
            <Route index element={<Navigate to={homePath} replace />} />
            <Route
              path="dashboard"
              element={
                <RouteGuard permission="stats.view">
                  <DashboardPage />
                </RouteGuard>
              }
            />
            <Route
              path="threads"
              element={
                <RouteGuard anyScope="content.view_admin">
                  <ThreadsPage />
                </RouteGuard>
              }
            />
            <Route
              path="replies"
              element={
                <RouteGuard anyScope="content.view_admin">
                  <RepliesPage />
                </RouteGuard>
              }
            />
            <Route
              path="boards"
              element={
                <RouteGuard>
                  <BoardsPage />
                </RouteGuard>
              }
            />
            <Route
              path="users"
              element={
                <RouteGuard permission="user.list">
                  <UsersPage />
                </RouteGuard>
              }
            />
            <Route
              path="uploads"
              element={
                <RouteGuard permission="upload.manage">
                  <UploadsPage />
                </RouteGuard>
              }
            />
            <Route
              path="settings"
              element={
                <RouteGuard permission="settings.manage">
                  <SettingsPage />
                </RouteGuard>
              }
            />
            <Route
              path="audit"
              element={
                <RouteGuard permission="audit.view">
                  <AuditPage />
                </RouteGuard>
              }
            />
            <Route path="*" element={<Navigate to={homePath} replace />} />
          </Routes>
        </main>

        <footer className="border-t border-border px-4 py-3 text-center">
          <Typography.Paragraph size="xs" color="muted">
            Moon 管理后台 · 登录态与论坛前台独立
          </Typography.Paragraph>
        </footer>
      </div>

      <OverlayScrollbar />

      <ConfirmDialog
        isOpen={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="退出管理后台？"
        description="退出后需要重新登录才能继续管理。论坛前台的登录态不受影响。"
        confirmLabel="退出管理后台"
        confirmVariant="primary"
        onConfirm={() => {
          void admin.logout()
          setLogoutOpen(false)
        }}
      />
    </div>
  )
}

export function AdminApp() {
  const admin = useAdmin()

  if (admin.status === 'anonymous') return <LoginPage />
  if (admin.status === 'forbidden') return <AccessDeniedPage />
  if (admin.status === 'error') return <ServiceErrorPage />
  if (admin.status === 'loading') return null

  return <AdminLayout />
}

export default AdminApp