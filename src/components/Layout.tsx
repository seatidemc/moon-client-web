import { Button, cn, Drawer, Dropdown, SearchField } from '@heroui/react'
import { LayoutGrid, LogOut, Menu, Search, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { BackToTop } from '@/components/BackToTop'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoginDialog } from '@/components/LoginDialog'
import { NotificationsPopover } from '@/components/NotificationsPopover'
import { OverlayScrollbar } from '@/components/OverlayScrollbar'
import { SiteFooter } from '@/components/SiteFooter'
import { UserAvatar } from '@/components/UserAvatar'
import { getBoardThemeStyle } from '@/lib/board-theme'
import { useForum } from '@/lib/forum-context'
import { getDisplayName } from '@/lib/user'
import { useCurrentBoardColor } from '@/lib/use-current-board-color'

/** 页头图标按钮的统一样式（铃铛、搜索、导航）。 */
const headerIconClass =
  'flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default-soft hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40'

export function Layout() {
  const { site, currentUser, logout, openLogin } = useForum()
  const boardColor = useCurrentBoardColor()
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
  const [drawerOpen, setDrawerOpen] = useState(false)
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
        <div className="mx-auto flex h-14 w-full max-w-[69.25rem] items-center gap-2 px-4 sm:gap-4">
          <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
            <Drawer.Trigger
              aria-label="打开导航"
              className={cn(headerIconClass, 'sm:hidden')}
            >
              <Menu className="size-5" aria-hidden="true" />
            </Drawer.Trigger>
            <Drawer.Backdrop>
              <Drawer.Content placement="left">
                <Drawer.Dialog aria-label="导航">
                  <Drawer.Header>
                    <Drawer.Heading>导航</Drawer.Heading>
                    <Drawer.CloseTrigger aria-label="关闭导航" />
                  </Drawer.Header>
                  <Drawer.Body>
                    <nav aria-label="移动端导航" className="flex flex-col gap-1">
                      <NavLink
                        to="/boards"
                        onClick={() => setDrawerOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-default-soft text-foreground'
                              : 'text-muted hover:bg-default-soft hover:text-foreground',
                          )
                        }
                      >
                        <LayoutGrid className="size-4 shrink-0" />
                        板块
                      </NavLink>
                    </nav>
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>

          <Link
            to="/"
            className="brand-logo shrink-0 text-lg tracking-tight"
            aria-label={`${site.siteName} 首页`}
          >
            {site.siteName}
          </Link>

          <nav aria-label="主导航" className="hidden shrink-0 items-center sm:flex">
            <NavLink
              to="/boards"
              aria-label="板块"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-default-soft text-foreground'
                    : 'text-muted hover:bg-default-soft hover:text-foreground',
                )
              }
            >
              <LayoutGrid className="size-4 shrink-0" />
              <span className="hidden sm:inline">板块</span>
            </NavLink>
          </nav>

          {isSearchPage ? null : (
            <form
              role="search"
              onSubmit={handleSearch}
              className="ml-auto hidden min-w-0 max-w-xs flex-1 sm:block sm:max-w-sm"
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
            className={cn(
              'ml-auto flex shrink-0 items-center gap-1.5',
              !isSearchPage && 'sm:ml-0',
            )}
          >
            {isSearchPage ? null : (
              <Link
                to="/search"
                aria-label="搜索"
                className={cn(headerIconClass, 'sm:hidden')}
              >
                <Search className="size-5" aria-hidden="true" />
              </Link>
            )}
            {currentUser ? (
              <>
                <NotificationsPopover />
                <Dropdown>
                  <Dropdown.Trigger
                    aria-label="账号菜单"
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-default-soft"
                  >
                    <UserAvatar user={currentUser} />
                    <span className="hidden max-w-24 truncate sm:inline">
                      {getDisplayName(currentUser)}
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
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="primary"
                style={getBoardThemeStyle(boardColor)}
                onPress={() => openLogin()}
              >
                登录
              </Button>
            )}
          </div>
        </div>
      </header>

      {site.announcement ? (
        <div className="border-b border-border bg-surface-secondary">
          <p className="mx-auto w-full max-w-[69.25rem] px-4 py-2 text-sm text-muted">
            {site.announcement}
          </p>
        </div>
      ) : null}

      <div className="flex-1">
        <Outlet />
      </div>

      <SiteFooter />

      <BackToTop />
      <OverlayScrollbar />
      <LoginDialog />
      <ConfirmDialog
        isOpen={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="退出登录？"
        description="退出后需要重新登录才能发帖和回复。"
        confirmLabel="退出登录"
        confirmVariant="primary"
        onConfirm={() => {
          void logout()
          setLogoutOpen(false)
        }}
      />
    </div>
  )
}
