import {
  Button,
  SearchField,
} from '@heroui/react'
import { LogOut, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { LoginDialog } from '@/components/LoginDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { SITE_NAME } from '@/lib/constants'
import { useForum } from '@/lib/forum-context'

export function Layout() {
  const { currentUser, logout, openLogin } = useForum()
  const location = useLocation()
  const navigate = useNavigate()
  const locationKey = `${location.pathname}${location.search}`
  const urlQuery =
    location.pathname === '/search'
      ? new URLSearchParams(location.search).get('q') ?? ''
      : ''
  const [draft, setDraft] = useState<{
    locationKey: string
    value: string
  } | null>(null)
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
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:gap-4">
          <Link
            to="/"
            className="shrink-0 text-base font-semibold tracking-tight"
            aria-label={`${SITE_NAME} 首页`}
          >
            {SITE_NAME}
          </Link>

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
              <SearchField.Group>
                <SearchField.SearchIcon>
                  <Search className="size-4" />
                </SearchField.SearchIcon>
                <SearchField.Input placeholder="搜索主题、标签或作者" />
                <SearchField.ClearButton aria-label="清空搜索" />
              </SearchField.Group>
            </SearchField>
          </form>

          <div className="flex shrink-0 items-center gap-1.5">
            {currentUser ? (
              <>
                <Link
                  to={`/user/${currentUser.id}`}
                  className="hidden items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-default-soft sm:flex"
                >
                  <UserAvatar user={currentUser} />
                  <span className="max-w-24 truncate">{currentUser.name}</span>
                </Link>
                <Link
                  to={`/user/${currentUser.id}`}
                  className="sm:hidden"
                  aria-label="个人中心"
                >
                  <UserAvatar user={currentUser} />
                </Link>
                <Button
                  type="button"
                  size="sm"
                  isIconOnly
                  variant="ghost"
                  aria-label="退出登录"
                  onPress={logout}
                >
                  <LogOut className="size-4" />
                </Button>
              </>
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
    </div>
  )
}
