import {
  Button,
  Card,
  Chip,
  EmptyState,
  Label,
  ListBox,
  Select,
  Table,
  Typography,
} from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
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
                <Card.Header>
                  <Card.Title>{group}</Card.Title>
                </Card.Header>
                <Card.Content className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Typography.Code className="text-xs font-medium">
                            {item.code}
                          </Typography.Code>
                          <Chip size="sm" variant="soft" color="default">
                            <Chip.Label>{SCOPE_LABELS[item.scope]}</Chip.Label>
                          </Chip>
                          {item.default ? (
                            <Chip size="sm" variant="soft" color="accent">
                              <Chip.Label>默认</Chip.Label>
                            </Chip>
                          ) : null}
                        </div>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          className="mt-0.5"
                        >
                          {item.description}
                        </Typography.Paragraph>
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
                </Card.Content>
              </Card>
            ))}
          </div>

          <div>
            <Card>
              <Card.Header>
                <Card.Title>权限持有者</Card.Title>
              </Card.Header>
              <Card.Content>
                {!selected ? (
                  <Typography.Paragraph size="sm" color="muted" className="mt-3">
                    从左侧选择一个权限点查看持有者。
                  </Typography.Paragraph>
                ) : (
                  <>
                    <Typography.Paragraph
                      size="xs"
                      color="muted"
                      className="mt-1"
                    >
                      {selected.code} · {selected.description} ·{' '}
                      {SCOPE_LABELS[selected.scope]}
                    </Typography.Paragraph>

                    {selected.scope === 'board' ? (
                      <div className="mt-3 max-w-56">
                        <Select
                          fullWidth
                          selectedKey={boardFilter || '__all__'}
                          onSelectionChange={(key) => {
                            setBoardFilter(
                              key === null || key === '__all__'
                                ? ''
                                : String(key),
                            )
                            setPage(1)
                          }}
                        >
                          <Label>范围筛选</Label>
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item
                                id="__all__"
                                textValue="不限范围"
                              >
                                不限范围
                              </ListBox.Item>
                              {boards
                                .filter((board) => !board.deleted)
                                .map((board) => (
                                  <ListBox.Item
                                    key={board.id}
                                    id={String(board.id)}
                                    textValue={board.name}
                                  >
                                    {board.name}
                                  </ListBox.Item>
                                ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
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
                      ) : (
                        <>
                          <Table aria-label="权限持有者">
                            <Table.ScrollContainer>
                              <Table.Content aria-label="权限持有者">
                                <Table.Header>
                                  <Table.Column id="user" isRowHeader>
                                    用户
                                  </Table.Column>
                                  <Table.Column id="scope">范围</Table.Column>
                                </Table.Header>
                                <Table.Body
                                  renderEmptyState={() => (
                                    <EmptyState>
                                      没有用户持有该权限点。
                                    </EmptyState>
                                  )}
                                >
                                  {usersQuery.data.items.map((item) => (
                                    <Table.Row
                                      key={`${item.id}:${item.boardId ?? 0}`}
                                      id={`${item.id}:${item.boardId ?? 0}`}
                                    >
                                      <Table.Cell>
                                        <span className="flex items-center gap-2">
                                          <UserAvatar user={item} />
                                          <span className="min-w-0">
                                            <span className="block max-w-40 truncate">
                                              {getDisplayName(item)}
                                            </span>
                                            <Typography.Paragraph
                                              size="xs"
                                              color="muted"
                                            >
                                              @{item.username}
                                            </Typography.Paragraph>
                                          </span>
                                        </span>
                                      </Table.Cell>
                                      <Table.Cell>
                                        {boardScopeLabel(
                                          item.boardId,
                                          boardNames,
                                        )}
                                      </Table.Cell>
                                    </Table.Row>
                                  ))}
                                </Table.Body>
                              </Table.Content>
                            </Table.ScrollContainer>
                          </Table>

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
              </Card.Content>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}