import { Button, Dropdown, SearchField } from '@heroui/react'
import { LogOut, Search, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoginDialog } from '@/components/LoginDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { SITE_NAME } from '@/lib/constants'
import { useForum } from '@/lib/forum-context'

export function Layout() {
  const { currentUser, logout, openLogin } = useForum()
  const location = useLocation()
  const navigate = useNavigate()
  const locationKey = `${location.pathname}${location.search}`
  const isSearchPage = location.pathname === '/search'
  const urlQuery =
    location.pathname === '/search'
      ? new URLSearchParams(location.search).get('q') ?? ''
      : ''
  const [draft, setDraft] = useState<{
    locationKey: string
    value: string
  } | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const query =
    draft?.locationKey === locationKey ? draft.value : urlQuery

  function updateQuery(value: string) {
    setDraft({ locationKey, value })
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = query.trim()
    navigate(normalized ? `/search?q=${encodeURIComponent(normalized)}` : '/search')
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="relative z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-[69.25rem] items-center gap-3 px-4 sm:gap-4">
          <Link
            to="/"
            className="brand-logo shrink-0 text-lg tracking-tight"
            aria-label={`${SITE_NAME} 首页`}
          >
            {SITE_NAME}
          </Link>

          {isSearchPage ? null : (
            <form
              role="search"
              onSubmit={handleSearch}
              className="ml-auto min-w-0 max-w-xs flex-1 sm:max-w-sm"
            >
              <SearchField
                aria-label="搜索主题、标签或作者"
                value={query}
                onChange={updateQuery}
                className="w-full"
              >
                <SearchField.Group className="rounded-full shadow-none">
                  <SearchField.SearchIcon>
                    <Search className="size-4" />
                  </SearchField.SearchIcon>
                  <SearchField.Input placeholder="搜索主题、标签或作者" />
                  <SearchField.ClearButton aria-label="清空搜索" />
                </SearchField.Group>
              </SearchField>
            </form>
          )}

          <div
            className={`flex shrink-0 items-center gap-1.5 ${
              isSearchPage ? 'ml-auto' : ''
            }`}
          >
            {currentUser ? (
              <Dropdown>
                <Dropdown.Trigger
                  aria-label="账号菜单"
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-default-soft"
                >
                  <UserAvatar user={currentUser} />
                  <span className="hidden max-w-24 truncate sm:inline">
                    {currentUser.name}
                  </span>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end" className="min-w-36">
                  <Dropdown.Menu
                    aria-label="账号菜单"
                    onAction={(key) => {
                      if (key === 'profile') {
                        navigate(`/user/${currentUser.id}`)
                      } else if (key === 'logout') {
                        setLogoutOpen(true)
                      }
                    }}
                  >
                    <Dropdown.Item id="profile" textValue="我的主页">
                      <User className="size-4 text-muted" />
                      <span data-slot="label">我的主页</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="logout"
                      textValue="退出登录"
                      variant="danger"
                    >
                      <LogOut className="size-4 text-danger" />
                      <span data-slot="label">退出登录</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onPress={() => openLogin()}
              >
                登录
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1">
        <Outlet />
      </div>

      <LoginDialog />
      <ConfirmDialog
        isOpen={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="退出登录？"
        description="退出后需要重新登录才能发帖和回复。"
        confirmLabel="退出登录"
        confirmVariant="primary"
        onConfirm={() => {
          logout()
          setLogoutOpen(false)
        }}
      />
    </div>
  )
}
