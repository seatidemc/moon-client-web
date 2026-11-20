import {
  Button,
  Input,
  Modal,
  TextArea,
  toast,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CircleCheck, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  Badge,
  ErrorPanel,
  Field,
  LoadingPanel,
  PageHeader,
  Pagination,
  SelectInput,
  TableWrap,
  TD_CLASS,
  TH_CLASS,
  TextInput,
  Toolbar,
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
          <p className="text-sm text-muted">该用户没有权限节点。</p>
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
                  <span className="font-medium">{grant.permissionCode}</span>
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
            <Field label="权限点" htmlFor="grant-code" className="min-w-64">
              <SelectInput
                id="grant-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value)
                  setBoardId('')
                }}
              >
                <option value="">选择权限点</option>
                {catalog.map((item: PermissionItem) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.description}（{item.scope}）
                  </option>
                ))}
              </SelectInput>
            </Field>

            {selectedPermission?.scope === 'board' ? (
              <Field label="范围" htmlFor="grant-board">
                <SelectInput
                  id="grant-board"
                  value={boardId}
                  onChange={(event) => setBoardId(event.target.value)}
                >
                  <option value="">全局</option>
                  {boards
                    .filter((board) => !board.deleted)
                    .map((board) => (
                      <option key={board.id} value={board.id}>
                        {board.name}
                      </option>
                    ))}
                </SelectInput>
              </Field>
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

          <Button
            variant="primary"
            isDisabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          >
            保存权限
          </Button>
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
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={TH_CLASS}>渠道</th>
              <th className={TH_CLASS}>IP</th>
              <th className={TH_CLASS}>User-Agent</th>
              <th className={TH_CLASS}>时间</th>
            </tr>
          </thead>
          <tbody>
            {recordsQuery.data.items.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-8 text-center text-muted"
                >
                  暂无登录记录
                </td>
              </tr>
            ) : (
              recordsQuery.data.items.map((record) => (
                <tr key={record.id}>
                  <td className={TD_CLASS}>
                    {record.channel === 'admin' ? '管理后台' : '论坛前台'}
                  </td>
                  <td className={TD_CLASS}>{record.ip}</td>
                  <td className={TD_CLASS}>
                    <span className="block max-w-72 truncate text-xs text-muted">
                      {record.userAgent || '—'}
                    </span>
                  </td>
                  <td className={TD_CLASS}>
                    <span className="text-xs text-muted">
                      {formatDateTime(record.createdAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
        <Modal.Container size="lg" scroll="inside">
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
                        <p className="text-base font-semibold">
                          {getDisplayName(user)}
                        </p>
                        {user.banned ? (
                          <Badge tone="danger">已封禁</Badge>
                        ) : null}
                        <Badge>{labRoleLabel(user.labRole)}</Badge>
                      </div>
                      <p className="text-sm text-muted">@{user.username}</p>
                      <p className="mt-1 text-xs text-muted">
                        #{user.id} · 注册于 {formatDateTime(user.createdAt)} ·
                        主题 {user.threadCount} · 跟帖 {user.replyCount} · 获赞{' '}
                        {user.likeCount}
                      </p>
                      <p className="text-xs text-muted">
                        最近论坛登录 {formatDateTimeOrDash(user.lastForumLoginAt)}
                        {' · '}
                        最近后台登录 {formatDateTimeOrDash(user.lastAdminLoginAt)}
                      </p>
                    </div>

                    {canBan ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        className={user.banned ? '' : 'text-danger'}
                        isDisabled={banMutation.isPending}
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
                      </Button>
                    ) : null}
                  </div>

                  <div className="flex gap-1 border-b border-border">
                    {tabs.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setTab(item.key)}
                        className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                          tab === item.key
                            ? 'border-accent text-accent'
                            : 'border-transparent text-muted hover:text-foreground'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {tab === 'profile' ? (
                    <div className="space-y-3">
                      <Field label="昵称" htmlFor="user-nickname">
                        <TextInput
                          id="user-nickname"
                          value={nickname}
                          maxLength={32}
                          placeholder="留空表示不设置昵称"
                          disabled={!canManageProfile}
                          onChange={(event) => setNickname(event.target.value)}
                        />
                      </Field>
                      <Field label="简介" htmlFor="user-bio">
                        <TextArea
                          id="user-bio"
                          fullWidth
                          rows={3}
                          maxLength={200}
                          value={bio}
                          disabled={!canManageProfile}
                          onChange={(event) => setBio(event.target.value)}
                        />
                      </Field>
                      {canManageProfile ? (
                        <Button
                          variant="primary"
                          isDisabled={profileSaving}
                          onPress={() => void saveProfile()}
                        >
                          保存资料
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {tab === 'permissions' ? (
                    <PermissionEditor
                      userId={userId}
                      canManage={canManagePermissions}
                    />
                  ) : null}

                  {tab === 'logins' ? <LoginRecords userId={userId} /> : null}
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
  const [permission, setPermission] = useState('')
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
      permission: permission || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [banned, keyword, page, permission],
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
    setPermission('')
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="用户管理"
        description="共享账号的论坛资料、封禁状态与权限节点。账号创建仍由 lab 负责。"
      />

      <Toolbar>
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="关键词" htmlFor="user-keyword" className="min-w-52">
            <Input
              id="user-keyword"
              fullWidth
              placeholder="用户名或昵称"
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
            />
          </Field>

          <Field label="封禁状态" htmlFor="user-banned">
            <SelectInput
              id="user-banned"
              value={banned}
              onChange={(event) => {
                setBanned(event.target.value)
                setPage(1)
              }}
            >
              <option value="">全部</option>
              <option value="true">已封禁</option>
              <option value="false">正常</option>
            </SelectInput>
          </Field>

          <Field label="拥有权限" htmlFor="user-permission" className="min-w-56">
            <SelectInput
              id="user-permission"
              value={permission}
              onChange={(event) => {
                setPermission(event.target.value)
                setPage(1)
              }}
            >
              <option value="">不限</option>
              {(catalogQuery.data?.items ?? []).map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Button type="submit" variant="primary">
            查询
          </Button>
          <Button variant="tertiary" onPress={resetFilters}>
            重置
          </Button>
        </form>
      </Toolbar>

      {usersQuery.isPending ? (
        <LoadingPanel />
      ) : usersQuery.isError ? (
        <ErrorPanel
          message={usersQuery.error.message}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <>
          <TableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH_CLASS}>ID</th>
                  <th className={TH_CLASS}>用户</th>
                  <th className={TH_CLASS}>角色</th>
                  <th className={TH_CLASS}>状态</th>
                  <th className={TH_CLASS}>内容</th>
                  <th className={TH_CLASS}>最近登录</th>
                  <th className={TH_CLASS}>操作</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-10 text-center text-muted"
                    >
                      没有符合条件的用户
                    </td>
                  </tr>
                ) : (
                  usersQuery.data.items.map((user) => (
                    <tr key={user.id}>
                      <td className={TD_CLASS}>{user.id}</td>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-2">
                          <UserAvatar user={user} />
                          <div className="min-w-0">
                            <p className="max-w-40 truncate font-medium">
                              {getDisplayName(user)}
                            </p>
                            <p className="text-xs text-muted">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={TD_CLASS}>
                        {labRoleLabel(user.labRole)}
                      </td>
                      <td className={TD_CLASS}>
                        {user.banned ? (
                          <Badge tone="danger">已封禁</Badge>
                        ) : (
                          <Badge tone="success">正常</Badge>
                        )}
                      </td>
                      <td className={TD_CLASS}>
                        <span className="text-xs text-muted">
                          {user.threadCount} 主题 · {user.replyCount} 跟帖
                        </span>
                      </td>
                      <td className={TD_CLASS}>
                        <span className="text-xs text-muted">
                          {formatDateTimeOrDash(user.lastForumLoginAt)}
                        </span>
                      </td>
                      <td className={TD_CLASS}>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`查看用户 ${user.username}`}
                          onPress={() => setDetailId(user.id)}
                        >
                          详情
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
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

      {detailId !== null ? (
        <UserDetailDialog
          userId={detailId}
          onClose={() => setDetailId(null)}
        />
      ) : null}
    </div>
  )
}