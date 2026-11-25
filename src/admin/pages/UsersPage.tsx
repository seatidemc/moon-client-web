import {
  Button,
  Card,
  Chip,
  EmptyState,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
  Table,
  Tabs,
  TextArea,
  TextField,
  Toolbar,
  Typography,
  toast,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CircleCheck, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PendingButton } from '@/components/PendingButton'
import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { boardScopeLabel, formatDateTimeOrDash, labRoleLabel } from '../lib'
import { adminKeys, useAdmin } from '../store'
import type {
  AdminBoard,
  Grant,
  PermissionItem,
} from '../types'

const PAGE_SIZE = 20
const BOARD_OPTIONS_QUERY = {
  includeDisabled: true,
  includeDeleted: true,
  pageSize: 100,
} as const

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后再试。'
}

function grantKey(grant: Grant): string {
  return `${grant.permissionCode}:${grant.boardId ?? 0}`
}

function PermissionEditor({
  userId,
  canManage,
}: {
  userId: number
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [grants, setGrants] = useState<Grant[]>([])
  const [initialized, setInitialized] = useState(false)
  const [code, setCode] = useState('')
  const [boardId, setBoardId] = useState('')

  const catalogQuery = useQuery({
    queryKey: adminKeys.permissionCatalog,
    queryFn: adminApi.permissionCatalog,
    staleTime: 300_000,
  })

  const grantsQuery = useQuery({
    queryKey: adminKeys.userPermissions(userId),
    queryFn: () => adminApi.userPermissions(userId),
  })

  const boardsQuery = useQuery({
    queryKey: adminKeys.boards(BOARD_OPTIONS_QUERY),
    queryFn: () => adminApi.boards(BOARD_OPTIONS_QUERY),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (grantsQuery.data && !initialized) {
      setGrants(grantsQuery.data.items)
      setInitialized(true)
    }
  }, [grantsQuery.data, initialized])

  const catalog = useMemo(
    () => catalogQuery.data?.items ?? [],
    [catalogQuery.data],
  )
  const boards = useMemo<AdminBoard[]>(
    () => boardsQuery.data?.items ?? [],
    [boardsQuery.data],
  )
  const boardNames = useMemo(
    () => new Map(boards.map((board) => [board.id, board.name])),
    [boards],
  )
  const selectedPermission = catalog.find((item) => item.code === code)

  const saveMutation = useMutation({
    mutationFn: () => adminApi.replaceUserPermissions(userId, grants),
    meta: { skipGlobalError: true },
    onSuccess: (result) => {
      setGrants(result.items)
      toast.success('权限已保存')
      void queryClient.invalidateQueries({
        queryKey: adminKeys.userPermissions(userId),
      })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (mutationError) => toast.danger(errorText(mutationError)),
  })

  function addGrant() {
    if (!selectedPermission) return
    const nextBoardId =
      selectedPermission.scope === 'board' && boardId ? Number(boardId) : null
    const grant: Grant = {
      permissionCode: selectedPermission.code,
      boardId: nextBoardId,
    }
    if (grants.some((item) => grantKey(item) === grantKey(grant))) {
      toast.danger('该授权已存在。')
      return
    }
    setGrants((current) => [...current, grant])
  }

  function removeGrant(grant: Grant) {
    setGrants((current) =>
      current.filter((item) => grantKey(item) !== grantKey(grant)),
    )
  }

  if (grantsQuery.isPending) return <LoadingPanel label="正在读取权限…" />
  if (grantsQuery.isError) {
    return (
      <ErrorPanel
        message={grantsQuery.error.message}
        onRetry={() => void grantsQuery.refetch()}
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {grants.length === 0 ? (
          <Typography.Paragraph size="sm" color="muted">
            该用户没有权限节点。
          </Typography.Paragraph>
        ) : (
          grants.map((grant) => {
            const definition = catalog.find(
              (item) => item.code === grant.permissionCode,
            )
            return (
              <div
                key={grantKey(grant)}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
              >
                <span className="min-w-0">
                  <Typography.Code weight="medium">
                    {grant.permissionCode}
                  </Typography.Code>
                  <span className="ml-2 text-xs text-muted">
                    {boardScopeLabel(grant.boardId, boardNames)}
                    {definition ? ` · ${definition.description}` : ''}
                  </span>
                </span>
                {canManage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`移除权限 ${grant.permissionCode}`}
                    onPress={() => removeGrant(grant)}
                  >
                    <X className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {canManage ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64">
              <Select
                selectedKey={code || '__none__'}
                onSelectionChange={(key) => {
                  setCode(key === null || key === '__none__' ? '' : String(key))
                  setBoardId('')
                }}
              >
                <Label>权限点</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="__none__" textValue="选择权限点">
                      选择权限点
                    </ListBox.Item>
                    {catalog.map((item: PermissionItem) => (
                      <ListBox.Item
                        key={item.code}
                        id={item.code}
                        textValue={`${item.code} · ${item.description}（${item.scope}）`}
                      >
                        {item.code} · {item.description}（{item.scope}）
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {selectedPermission?.scope === 'board' ? (
              <Select
                selectedKey={boardId || '__global__'}
                onSelectionChange={(key) => {
                  setBoardId(
                    key === null || key === '__global__' ? '' : String(key),
                  )
                }}
              >
                <Label>范围</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="__global__" textValue="全局">
                      全局
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
            ) : null}

            <Button
              variant="tertiary"
              isDisabled={!selectedPermission}
              onPress={addGrant}
            >
              <Plus className="size-4" />
              添加授权
            </Button>
          </div>

          <PendingButton
            variant="primary"
            isPending={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            保存权限
          </PendingButton>
        </>
      ) : null}
    </div>
  )
}

function LoginRecords({ userId }: { userId: number }) {
  const [page, setPage] = useState(1)
  const recordsQuery = useQuery({
    queryKey: adminKeys.loginRecords(userId, page),
    queryFn: () => adminApi.loginRecords(userId, page, PAGE_SIZE),
  })

  if (recordsQuery.isPending) return <LoadingPanel label="正在读取登录记录…" />
  if (recordsQuery.isError) {
    return (
      <ErrorPanel
        message={recordsQuery.error.message}
        onRetry={() => void recordsQuery.refetch()}
      />
    )
  }

  return (
    <div>
      <Table aria-label="登录记录">
        <Table.ScrollContainer>
          <Table.Content aria-label="登录记录">
            <Table.Header>
              <Table.Column id="channel" isRowHeader>
                渠道
              </Table.Column>
              <Table.Column id="ip">IP</Table.Column>
              <Table.Column id="userAgent">User-Agent</Table.Column>
              <Table.Column id="created">时间</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => <EmptyState>暂无登录记录</EmptyState>}
            >
              {recordsQuery.data.items.map((record) => (
                <Table.Row key={record.id} id={record.id}>
                  <Table.Cell>
                    {record.channel === 'admin' ? '管理后台' : '论坛前台'}
                  </Table.Cell>
                  <Table.Cell>{record.ip}</Table.Cell>
                  <Table.Cell>
                    <Typography.Paragraph
                      size="xs"
                      color="muted"
                      truncate
                      className="max-w-72"
                    >
                      {record.userAgent || '—'}
                    </Typography.Paragraph>
                  </Table.Cell>
                  <Table.Cell>
                    <Typography.Paragraph size="xs" color="muted">
                      {formatDateTime(record.createdAt)}
                    </Typography.Paragraph>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <Pagination
        page={recordsQuery.data.page}
        pageSize={recordsQuery.data.pageSize}
        total={recordsQuery.data.total}
        onChange={setPage}
      />
    </div>
  )
}

function UserDetailDialog({
  userId,
  onClose,
}: {
  userId: number
  onClose: () => void
}) {
  const admin = useAdmin()
  const queryClient = useQueryClient()

  const userQuery = useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: () => adminApi.user(userId),
  })

  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [profileInitialized, setProfileInitialized] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [banOpen, setBanOpen] = useState(false)
  const [tab, setTab] = useState<'profile' | 'permissions' | 'logins'>('profile')

  useEffect(() => {
    if (userQuery.data && !profileInitialized) {
      setNickname(userQuery.data.nickname ?? '')
      setBio(userQuery.data.bio)
      setProfileInitialized(true)
    }
  }, [profileInitialized, userQuery.data])

  const canManageProfile = admin.canGlobal('user.manage')
  const canBan = admin.canGlobal('user.ban')
  const canViewPermissions =
    admin.canGlobal('permission.view') ||
    admin.canGlobal('permission.manage')
  const canManagePermissions = admin.canGlobal('permission.manage')

  async function saveProfile() {
    if (profileSaving) return
    setProfileSaving(true)
    try {
      const updated = await adminApi.updateUserProfile(userId, {
        nickname: nickname.trim() ? nickname.trim() : null,
        bio,
      })
      queryClient.setQueryData(adminKeys.user(userId), updated)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('用户资料已保存')
    } catch (error) {
      toast.danger(errorText(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const banMutation = useMutation({
    mutationFn: (banned: boolean) => adminApi.setUserBanned(userId, banned),
    meta: { skipGlobalError: true },
    onSuccess: (updated) => {
      queryClient.setQueryData(adminKeys.user(userId), updated)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success(updated.banned ? '用户已封禁' : '用户已解封')
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const user = userQuery.data

  const tabs: Array<{ key: 'profile' | 'permissions' | 'logins'; label: string }> = [
    { key: 'profile', label: '资料' },
    ...(canViewPermissions
      ? [{ key: 'permissions' as const, label: '权限' }]
      : []),
    { key: 'logins', label: '登录记录' },
  ]

  return (
    <>
      <Modal isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside" placement="top">
            <Modal.Dialog>
              <Modal.CloseTrigger aria-label="关闭用户详情" />
              <Modal.Header>
                <Modal.Heading>用户详情</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                {userQuery.isPending ? (
                  <LoadingPanel />
                ) : userQuery.isError ? (
                  <ErrorPanel
                    message={userQuery.error.message}
                    onRetry={() => void userQuery.refetch()}
                  />
                ) : !user ? null : (
                  <>
                    <div className="flex items-start gap-3">
                      <UserAvatar user={user} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Typography.Heading
                            level={3}
                            className="text-base font-semibold"
                          >
                            {getDisplayName(user)}
                          </Typography.Heading>
                          {user.banned ? (
                            <Chip size="sm" variant="soft" color="danger">
                              <Chip.Label>已封禁</Chip.Label>
                            </Chip>
                          ) : null}
                          <Chip size="sm" variant="soft" color="default">
                            <Chip.Label>{labRoleLabel(user.labRole)}</Chip.Label>
                          </Chip>
                        </div>
                        <Typography.Paragraph size="sm" color="muted">
                          @{user.username}
                        </Typography.Paragraph>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          className="mt-1"
                        >
                          #{user.id} · 注册于 {formatDateTime(user.createdAt)} ·
                          主题 {user.threadCount} · 回复 {user.replyCount} · 获赞{' '}
                          {user.likeCount}
                        </Typography.Paragraph>
                        <Typography.Paragraph size="xs" color="muted">
                          最近论坛登录{' '}
                          {formatDateTimeOrDash(user.lastForumLoginAt)}
                          {' · '}
                          最近后台登录{' '}
                          {formatDateTimeOrDash(user.lastAdminLoginAt)}
                        </Typography.Paragraph>
                      </div>

                      {canBan ? (
                        <PendingButton
                          size="sm"
                          variant="tertiary"
                          className={user.banned ? '' : 'text-danger'}
                          isPending={banMutation.isPending}
                          onPress={() => {
                            if (user.banned) {
                              banMutation.mutate(false)
                            } else {
                              setBanOpen(true)
                            }
                          }}
                        >
                          {user.banned ? (
                            <>
                              <CircleCheck className="size-4" />
                              解封
                            </>
                          ) : (
                            <>
                              <Ban className="size-4" />
                              封禁
                            </>
                          )}
                        </PendingButton>
                      ) : null}
                    </div>

                    <Tabs
                      selectedKey={tab}
                      onSelectionChange={(key) => {
                        if (
                          key === 'profile' ||
                          key === 'permissions' ||
                          key === 'logins'
                        ) {
                          setTab(key)
                        }
                      }}
                    >
                      <Tabs.ListContainer>
                        <Tabs.List aria-label="用户详情分区">
                          {tabs.map((item) => (
                            <Tabs.Tab key={item.key} id={item.key}>
                              {item.label}
                              <Tabs.Indicator />
                            </Tabs.Tab>
                          ))}
                        </Tabs.List>
                      </Tabs.ListContainer>

                      <Tabs.Panel id="profile" className="mt-3">
                        <div className="space-y-3">
                          <TextField fullWidth isDisabled={!canManageProfile}>
                            <Label>昵称</Label>
                            <Input
                              value={nickname}
                              maxLength={32}
                              placeholder="留空表示不设置昵称"
                              onChange={(event) =>
                                setNickname(event.target.value)
                              }
                            />
                          </TextField>
                          <TextField fullWidth isDisabled={!canManageProfile}>
                            <Label>简介</Label>
                            <TextArea
                              rows={3}
                              maxLength={200}
                              value={bio}
                              onChange={(event) => setBio(event.target.value)}
                            />
                          </TextField>
                          {canManageProfile ? (
                            <PendingButton
                              variant="primary"
                              isPending={profileSaving}
                              onPress={() => void saveProfile()}
                            >
                              保存资料
                            </PendingButton>
                          ) : null}
                        </div>
                      </Tabs.Panel>

                      {canViewPermissions ? (
                        <Tabs.Panel id="permissions" className="mt-3">
                          <PermissionEditor
                            userId={userId}
                            canManage={canManagePermissions}
                          />
                        </Tabs.Panel>
                      ) : null}

                      <Tabs.Panel id="logins" className="mt-3">
                        <LoginRecords userId={userId} />
                      </Tabs.Panel>
                    </Tabs>
                  </>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ConfirmDialog
        isOpen={banOpen}
        onOpenChange={setBanOpen}
        title={`封禁用户「${user ? getDisplayName(user) : ''}」？`}
        description="封禁后该用户无法登录论坛与管理后台。"
        confirmLabel="封禁用户"
        onConfirm={() => {
          banMutation.mutate(true)
          setBanOpen(false)
        }}
      />
    </>
  )
}

export function UsersPage() {
  useAdminPageTitle('用户管理')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [banned, setBanned] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)

  const catalogQuery = useQuery({
    queryKey: adminKeys.permissionCatalog,
    queryFn: adminApi.permissionCatalog,
    staleTime: 300_000,
    retry: false,
  })

  const query = useMemo(
    () => ({
      keyword: keyword || undefined,
      banned: banned === '' ? undefined : banned === 'true',
      permission: permissions.length ? permissions : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [banned, keyword, page, permissions],
  )

  const usersQuery = useQuery({
    queryKey: adminKeys.users(query),
    queryFn: () => adminApi.users(query),
  })

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setKeyword(keywordDraft.trim())
    setPage(1)
  }

  function resetFilters() {
    setKeywordDraft('')
    setKeyword('')
    setBanned('')
    setPermissions([])
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="用户管理"
        description="共享账号的论坛资料、封禁状态与权限节点；仅显示至少登录过一次论坛的账号。账号创建仍由 lab 负责。"
      />

      <Card className="mb-4">
        <Toolbar
          aria-label="用户筛选"
          className="flex flex-wrap items-end gap-3"
        >
          <Form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <SearchField
              fullWidth
              className="min-w-52"
              value={keywordDraft}
              onChange={setKeywordDraft}
            >
              <Label>关键词</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="用户名或昵称" />
                <SearchField.ClearButton aria-label="清空关键词" />
              </SearchField.Group>
            </SearchField>

            <Select
              selectedKey={banned || '__all__'}
              onSelectionChange={(key) => {
                setBanned(
                  key === null || key === '__all__' ? '' : String(key),
                )
                setPage(1)
              }}
            >
              <Label>封禁状态</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__all__" textValue="全部">
                    全部
                  </ListBox.Item>
                  <ListBox.Item id="true" textValue="已封禁">
                    已封禁
                  </ListBox.Item>
                  <ListBox.Item id="false" textValue="正常">
                    正常
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectionMode="multiple"
              value={permissions}
              onChange={(keys) => {
                setPermissions(keys.map(String))
                setPage(1)
              }}
              placeholder="不限"
            >
              <Label>拥有权限</Label>
              <Select.Trigger>
                <Select.Value>
                  <span
                    title={
                      permissions.length ? permissions.join('、') : undefined
                    }
                  >
                    {permissions.length === 0
                      ? '不限'
                      : permissions.length === 1
                        ? permissions[0]
                        : `已选 ${permissions.length} 项`}
                  </span>
                </Select.Value>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {(catalogQuery.data?.items ?? []).map((item) => (
                    <ListBox.Item
                      key={item.code}
                      id={item.code}
                      textValue={item.code}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {item.code}
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Button type="submit" variant="primary">
              查询
            </Button>
            <Button variant="tertiary" onPress={resetFilters}>
              重置
            </Button>
          </Form>
        </Toolbar>
      </Card>

      {usersQuery.isPending ? (
        <LoadingPanel />
      ) : usersQuery.isError ? (
        <ErrorPanel
          message={usersQuery.error.message}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="用户列表">
            <Table.ScrollContainer>
              <Table.Content aria-label="用户列表">
                <Table.Header>
                  <Table.Column id="id">ID</Table.Column>
                  <Table.Column id="user" isRowHeader>
                    用户
                  </Table.Column>
                  <Table.Column id="role">角色</Table.Column>
                  <Table.Column id="status">状态</Table.Column>
                  <Table.Column id="content">内容</Table.Column>
                  <Table.Column id="login">最近登录</Table.Column>
                  <Table.Column id="actions">操作</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState>没有符合条件的用户</EmptyState>
                  )}
                >
                  {usersQuery.data.items.map((user) => (
                    <Table.Row key={user.id} id={user.id}>
                      <Table.Cell>{user.id}</Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <Typography.Paragraph
                              weight="medium"
                              truncate
                              className="max-w-40"
                            >
                              {getDisplayName(user)}
                            </Typography.Paragraph>
                            <Typography.Paragraph size="xs" color="muted">
                              @{user.username}
                            </Typography.Paragraph>
                          </div>
                        </div>
                      </Table.Cell>
                      <Table.Cell>{labRoleLabel(user.labRole)}</Table.Cell>
                      <Table.Cell>
                        {user.banned ? (
                          <Chip size="sm" variant="soft" color="danger">
                            <Chip.Label>已封禁</Chip.Label>
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="soft" color="success">
                            <Chip.Label>正常</Chip.Label>
                          </Chip>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="xs" color="muted">
                          {user.threadCount} 主题 · {user.replyCount} 回复
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="xs" color="muted">
                          {formatDateTimeOrDash(user.lastForumLoginAt)}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`查看用户 ${user.username}`}
                          onPress={() => setDetailId(user.id)}
                        >
                          详情
                        </Button>
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

      {detailId !== null ? (
        <UserDetailDialog
          userId={detailId}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </div>
  )
}