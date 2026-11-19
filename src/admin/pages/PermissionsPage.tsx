import { Button } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'

import { adminApi } from '../api'
import {
  Badge,
  Card,
  EmptyState,
  ErrorPanel,
  Field,
  LoadingPanel,
  PageHeader,
  Pagination,
  SelectInput,
  TableWrap,
  TD_CLASS,
  TH_CLASS,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { boardScopeLabel } from '../lib'
import { adminKeys } from '../store'
import type { AdminBoard, PermissionScope } from '../types'

const BOARD_OPTIONS_QUERY = {
  includeDisabled: true,
  includeDeleted: true,
  pageSize: 100,
} as const

const SCOPE_LABELS: Record<PermissionScope, string> = {
  global: '全局',
  board: '板块',
  self: '自助',
}

const GROUP_ORDER = ['内容', '用户', '审核', '板块', '权限', '运营', '后台']

export function PermissionsPage() {
  useAdminPageTitle('权限目录')
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [boardFilter, setBoardFilter] = useState('')
  const [page, setPage] = useState(1)

  const catalogQuery = useQuery({
    queryKey: adminKeys.permissionCatalog,
    queryFn: adminApi.permissionCatalog,
    staleTime: 300_000,
  })

  const boardsQuery = useQuery({
    queryKey: adminKeys.boards(BOARD_OPTIONS_QUERY),
    queryFn: () => adminApi.boards(BOARD_OPTIONS_QUERY),
    staleTime: 60_000,
  })

  const boards = useMemo<AdminBoard[]>(
    () => boardsQuery.data?.items ?? [],
    [boardsQuery.data],
  )
  const boardNames = useMemo(
    () => new Map(boards.map((board) => [board.id, board.name])),
    [boards],
  )

  const catalog = useMemo(
    () => catalogQuery.data?.items ?? [],
    [catalogQuery.data],
  )
  const selected = catalog.find((item) => item.code === selectedCode)

  const groups = useMemo(() => {
    const map = new Map<string, typeof catalog>()
    for (const item of catalog) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return [...map.entries()].sort(
      (a, b) =>
        GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]) ||
        a[0].localeCompare(b[0]),
    )
  }, [catalog])

  const usersQuery = useQuery({
    queryKey: adminKeys.permissionUsers(
      selectedCode ?? '',
      boardFilter ? Number(boardFilter) : null,
      page,
    ),
    queryFn: () =>
      adminApi.permissionUsers(selectedCode ?? '', {
        boardId: boardFilter ? Number(boardFilter) : undefined,
        page,
      }),
    enabled: selectedCode !== null,
  })

  function choosePermission(code: string) {
    setSelectedCode(code)
    setBoardFilter('')
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="权限目录"
        description="权限点定义在代码中，只读；选择权限点可查看持有该权限的用户。"
      />

      {catalogQuery.isPending ? (
        <LoadingPanel />
      ) : catalogQuery.isError ? (
        <ErrorPanel
          message={catalogQuery.error.message}
          onRetry={() => void catalogQuery.refetch()}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            {groups.map(([group, items]) => (
              <Card key={group}>
                <h2 className="mb-2 text-sm font-medium">{group}</h2>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <code className="text-xs font-medium">
                            {item.code}
                          </code>
                          <Badge>{SCOPE_LABELS[item.scope]}</Badge>
                          {item.default ? <Badge tone="accent">默认</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`查看权限 ${item.code} 的持有者`}
                        onPress={() => choosePermission(item.code)}
                      >
                        查看用户
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div>
            <Card>
              <h2 className="text-sm font-medium">权限持有者</h2>
              {!selected ? (
                <p className="mt-3 text-sm text-muted">
                  从左侧选择一个权限点查看持有者。
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted">
                    {selected.code} · {selected.description} ·{' '}
                    {SCOPE_LABELS[selected.scope]}
                  </p>

                  {selected.scope === 'board' ? (
                    <div className="mt-3 max-w-56">
                      <Field label="范围筛选" htmlFor="permission-board">
                        <SelectInput
                          id="permission-board"
                          value={boardFilter}
                          onChange={(event) => {
                            setBoardFilter(event.target.value)
                            setPage(1)
                          }}
                        >
                          <option value="">不限范围</option>
                          {boards
                            .filter((board) => !board.deleted)
                            .map((board) => (
                              <option key={board.id} value={board.id}>
                                {board.name}
                              </option>
                            ))}
                        </SelectInput>
                      </Field>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    {usersQuery.isPending ? (
                      <LoadingPanel />
                    ) : usersQuery.isError ? (
                      <ErrorPanel
                        message={usersQuery.error.message}
                        onRetry={() => void usersQuery.refetch()}
                      />
                    ) : usersQuery.data.items.length === 0 ? (
                      <EmptyState>没有用户持有该权限点。</EmptyState>
                    ) : (
                      <>
                        <TableWrap>
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className={TH_CLASS}>用户</th>
                                <th className={TH_CLASS}>范围</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usersQuery.data.items.map((item) => (
                                <tr key={`${item.id}:${item.boardId ?? 0}`}>
                                  <td className={TD_CLASS}>
                                    <span className="flex items-center gap-2">
                                      <UserAvatar user={item} />
                                      <span className="min-w-0">
                                        <span className="block max-w-40 truncate">
                                          {getDisplayName(item)}
                                        </span>
                                        <span className="text-xs text-muted">
                                          @{item.username}
                                        </span>
                                      </span>
                                    </span>
                                  </td>
                                  <td className={TD_CLASS}>
                                    {boardScopeLabel(item.boardId, boardNames)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </TableWrap>

                        <Pagination
                          page={usersQuery.data.page}
                          pageSize={usersQuery.data.pageSize}
                          total={usersQuery.data.total}
                          onChange={setPage}
                        />
                      </>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}