import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  SearchField,
  Select,
  Surface,
  Table,
  TextField,
  Toolbar,
  Typography,
  toast,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Eye,
  Lock,
  LockOpen,
  Move,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'
import { PostContent } from '@/components/PostContent'
import { UserAvatar } from '@/components/UserAvatar'
import { formatDateTime } from '@/lib/utils'
import { getDisplayName } from '@/lib/user'

import { adminApi } from '../api'
import { ReasonDialog } from '../components/ReasonDialog'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { formatDateTimeOrDash } from '../lib'
import { adminKeys, useAdmin } from '../store'
import type { AdminBoard, AdminThread, BatchFailure } from '../types'

const PAGE_SIZE = 20
const BOARD_OPTIONS_QUERY = {
  includeDisabled: true,
  includeDeleted: true,
  pageSize: 100,
} as const

type ThreadAction =
  | 'pin'
  | 'unpin'
  | 'lock'
  | 'unlock'
  | 'delete'
  | 'restore'
  | 'move'

const ACTION_LABELS: Record<ThreadAction, string> = {
  pin: '置顶',
  unpin: '取消置顶',
  lock: '锁定',
  unlock: '解锁',
  delete: '删除',
  restore: '恢复',
  move: '移动板块',
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后再试。'
}

function useBoards() {
  return useQuery({
    queryKey: adminKeys.boards(BOARD_OPTIONS_QUERY),
    queryFn: () => adminApi.boards(BOARD_OPTIONS_QUERY),
    staleTime: 60_000,
  })
}

function ThreadDetailDialog({
  threadId,
  onClose,
  onMove,
  onDelete,
}: {
  threadId: number
  onClose: () => void
  onMove: (thread: AdminThread) => void
  onDelete: (thread: AdminThread) => void
}) {
  const admin = useAdmin()
  const queryClient = useQueryClient()

  const detailQuery = useQuery({
    queryKey: adminKeys.thread(threadId),
    queryFn: () => adminApi.thread(threadId),
  })

  const updateMutation = useMutation({
    mutationFn: (patch: { pinned?: boolean; locked?: boolean }) =>
      adminApi.updateThread(threadId, patch),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('主题状态已更新')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'threads'] })
      await queryClient.invalidateQueries({
        queryKey: adminKeys.thread(threadId),
      })
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const restoreMutation = useMutation({
    mutationFn: () => adminApi.restoreThread(threadId),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('主题已恢复')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'threads'] })
      await queryClient.invalidateQueries({
        queryKey: adminKeys.thread(threadId),
      })
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const thread = detailQuery.data

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭主题详情" />
            <Modal.Header>
              <Modal.Heading>主题详情</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {detailQuery.isPending ? (
                <LoadingPanel />
              ) : detailQuery.isError ? (
                <ErrorPanel
                  message={detailQuery.error.message}
                  onRetry={() => void detailQuery.refetch()}
                />
              ) : !thread ? null : (
                <>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip size="sm" variant="soft" color="accent">
                        <Chip.Label>{thread.board.name}</Chip.Label>
                      </Chip>
                      {thread.pinned ? (
                        <Chip size="sm" variant="soft" color="warning">
                          <Chip.Label>置顶</Chip.Label>
                        </Chip>
                      ) : null}
                      {thread.locked ? (
                        <Chip size="sm" variant="soft" color="default">
                          <Chip.Label>锁定</Chip.Label>
                        </Chip>
                      ) : null}
                      {thread.deleted ? (
                        <Chip size="sm" variant="soft" color="danger">
                          <Chip.Label>已删除</Chip.Label>
                        </Chip>
                      ) : null}
                    </div>
                    <Typography.Heading
                      level={2}
                      className="mt-2 text-lg font-semibold"
                    >
                      {thread.title}
                    </Typography.Heading>
                    <Typography.Paragraph
                      size="xs"
                      color="muted"
                      className="mt-1"
                    >
                      #{thread.id} · 作者{' '}
                      {thread.author
                        ? getDisplayName(thread.author)
                        : '已注销用户'}{' '}
                      · 创建于 {formatDateTime(thread.createdAt)} · 最后回复{' '}
                      {formatDateTimeOrDash(thread.lastReplyAt)}
                    </Typography.Paragraph>
                    <Typography.Paragraph
                      size="xs"
                      color="muted"
                      className="mt-1"
                    >
                      回复 {thread.replyCount} · 获赞 {thread.likeCount}
                    </Typography.Paragraph>
                  </div>

                  <Surface variant="secondary" className="px-4 py-3">
                    {thread.contentHtml ? (
                      <PostContent>{thread.contentHtml}</PostContent>
                    ) : (
                      <Typography.Paragraph size="sm" color="muted">
                        正文不可用。
                      </Typography.Paragraph>
                    )}
                  </Surface>

                  <div className="flex flex-wrap gap-2">
                    {!thread.deleted && admin.can('thread.pin', thread.boardId) ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={updateMutation.isPending}
                        onPress={() =>
                          updateMutation.mutate({ pinned: !thread.pinned })
                        }
                      >
                        {thread.pinned ? (
                          <>
                            <PinOff className="size-4" />
                            取消置顶
                          </>
                        ) : (
                          <>
                            <Pin className="size-4" />
                            置顶主题
                          </>
                        )}
                      </Button>
                    ) : null}

                    {!thread.deleted && admin.can('thread.lock', thread.boardId) ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={updateMutation.isPending}
                        onPress={() =>
                          updateMutation.mutate({ locked: !thread.locked })
                        }
                      >
                        {thread.locked ? (
                          <>
                            <LockOpen className="size-4" />
                            解锁主题
                          </>
                        ) : (
                          <>
                            <Lock className="size-4" />
                            锁定主题
                          </>
                        )}
                      </Button>
                    ) : null}

                    {!thread.deleted &&
                    admin.can('thread.move', thread.boardId) ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => onMove(thread)}
                      >
                        <Move className="size-4" />
                        移动主题
                      </Button>
                    ) : null}

                    {!thread.deleted &&
                    admin.can('thread.delete_any', thread.boardId) ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        className="text-danger"
                        onPress={() => onDelete(thread)}
                      >
                        <Trash2 className="size-4" />
                        删除主题
                      </Button>
                    ) : null}

                    {thread.deleted &&
                    admin.can('content.restore', thread.boardId) ? (
                      <Button
                        size="sm"
                        variant="tertiary"
                        isDisabled={restoreMutation.isPending}
                        onPress={() => restoreMutation.mutate()}
                      >
                        <RotateCcw className="size-4" />
                        恢复主题
                      </Button>
                    ) : null}
                  </div>

                  {thread.deleted ? (
                    <Typography.Paragraph size="xs" color="muted">
                      删除于 {formatDateTimeOrDash(thread.deletedAt)}
                      {thread.deletedBy
                        ? ` · 操作人 #${thread.deletedBy}`
                        : ''}
                    </Typography.Paragraph>
                  ) : null}
                </>
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export function ThreadsPage() {
  useAdminPageTitle('主题管理')
  const admin = useAdmin()
  const queryClient = useQueryClient()
  const boardsQuery = useBoards()

  const [boardId, setBoardId] = useState('')
  const [status, setStatus] = useState('active')
  const [pinned, setPinned] = useState('')
  const [locked, setLocked] = useState('')
  const [sort, setSort] = useState('created')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<number[]>([])
  const [batchAction, setBatchAction] = useState<ThreadAction>('pin')
  const [batchReason, setBatchReason] = useState('')
  const [batchBoardId, setBatchBoardId] = useState('')
  const [batchFailures, setBatchFailures] = useState<BatchFailure[]>([])

  const [detailId, setDetailId] = useState<number | null>(null)
  const [reasonTarget, setReasonTarget] = useState<AdminThread | null>(null)
  const [moveTarget, setMoveTarget] = useState<AdminThread | null>(null)
  const [moveBoardId, setMoveBoardId] = useState('')
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const query = useMemo(
    () => ({
      boardId: boardId ? Number(boardId) : undefined,
      status,
      pinned: pinned === '' ? undefined : pinned === 'true',
      locked: locked === '' ? undefined : locked === 'true',
      sort,
      keyword: keyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [boardId, keyword, locked, page, pinned, sort, status],
  )

  const threadsQuery = useQuery({
    queryKey: adminKeys.threads(query),
    queryFn: () => adminApi.threads(query),
  })

  const threads = threadsQuery.data?.items ?? []
  const boards: AdminBoard[] = boardsQuery.data?.items ?? []
  const moveBoards = boards.filter(
    (board) => !board.deleted && board.enabled,
  )

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'threads'] })
    if (detailId !== null) {
      void queryClient.invalidateQueries({
        queryKey: adminKeys.thread(detailId),
      })
    }
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (input: { id: number; reason: string }) =>
      adminApi.deleteThread(input.id, input.reason || undefined),
    meta: { skipGlobalError: true },
    onSuccess: () => {
      toast.success('主题已删除')
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => adminApi.restoreThread(id),
    meta: { skipGlobalError: true },
    onSuccess: () => {
      toast.success('主题已恢复')
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const moveMutation = useMutation({
    mutationFn: (input: { id: number; boardId: number }) =>
      adminApi.updateThread(input.id, { boardId: input.boardId }),
    meta: { skipGlobalError: true },
    onSuccess: () => {
      toast.success('主题已移动')
      setMoveTarget(null)
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const batchMutation = useMutation({
    mutationFn: () =>
      adminApi.batchThreads({
        ids: selected,
        action: batchAction,
        boardId:
          batchAction === 'move' && batchBoardId
            ? Number(batchBoardId)
            : undefined,
        reason: batchReason.trim() || undefined,
      }),
    meta: { skipGlobalError: true },
    onSuccess: (result) => {
      if (result.succeeded.length > 0) {
        toast.success(`批量操作成功 ${result.succeeded.length} 条`)
      }
      if (result.failed.length > 0) {
        setBatchFailures(result.failed)
        toast.danger(`批量操作失败 ${result.failed.length} 条`)
      } else {
        setBatchFailures([])
      }
      setSelected([])
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setKeyword(keywordDraft.trim())
    setPage(1)
  }

  function resetFilters() {
    setBoardId('')
    setStatus('active')
    setPinned('')
    setLocked('')
    setSort('created')
    setKeywordDraft('')
    setKeyword('')
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="主题管理"
        description="筛选、审核、移动与恢复论坛主题。删除操作写入审计日志。"
      />

      <Card className="mb-4">
        <Toolbar
          aria-label="主题筛选"
          className="flex flex-wrap items-end gap-3"
        >
          <Form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <Select
              selectedKey={boardId || '__all__'}
              onSelectionChange={(key) => {
                setBoardId(
                  key === null || key === '__all__' ? '' : String(key),
                )
                setPage(1)
              }}
            >
              <Label>板块</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__all__" textValue="全部板块">
                    全部板块
                  </ListBox.Item>
                  {boards.map((board) => (
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

            <Select
              selectedKey={status}
              onSelectionChange={(key) => {
                if (key !== null) {
                  setStatus(String(key))
                  setPage(1)
                }
              }}
            >
              <Label>状态</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="active" textValue="正常">
                    正常
                  </ListBox.Item>
                  <ListBox.Item id="deleted" textValue="已删除">
                    已删除
                  </ListBox.Item>
                  <ListBox.Item id="all" textValue="全部">
                    全部
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={pinned || '__all__'}
              onSelectionChange={(key) => {
                setPinned(
                  key === null || key === '__all__' ? '' : String(key),
                )
                setPage(1)
              }}
            >
              <Label>置顶</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__all__" textValue="不限">
                    不限
                  </ListBox.Item>
                  <ListBox.Item id="true" textValue="已置顶">
                    已置顶
                  </ListBox.Item>
                  <ListBox.Item id="false" textValue="未置顶">
                    未置顶
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={locked || '__all__'}
              onSelectionChange={(key) => {
                setLocked(
                  key === null || key === '__all__' ? '' : String(key),
                )
                setPage(1)
              }}
            >
              <Label>锁定</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__all__" textValue="不限">
                    不限
                  </ListBox.Item>
                  <ListBox.Item id="true" textValue="已锁定">
                    已锁定
                  </ListBox.Item>
                  <ListBox.Item id="false" textValue="未锁定">
                    未锁定
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={sort}
              onSelectionChange={(key) => {
                if (key !== null) setSort(String(key))
              }}
            >
              <Label>排序</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="created" textValue="创建时间">
                    创建时间
                  </ListBox.Item>
                  <ListBox.Item id="pinned" textValue="置顶时间">
                    置顶时间
                  </ListBox.Item>
                  <ListBox.Item id="last_reply" textValue="最后回复">
                    最后回复
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>

            <SearchField
              fullWidth
              className="min-w-52"
              value={keywordDraft}
              onChange={setKeywordDraft}
            >
              <Label>关键词</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="标题或正文" />
                <SearchField.ClearButton aria-label="清空关键词" />
              </SearchField.Group>
            </SearchField>

            <Button type="submit" variant="primary">
              查询
            </Button>
            <Button variant="tertiary" onPress={resetFilters}>
              重置
            </Button>
          </Form>
        </Toolbar>
      </Card>

      <Card className="mb-4">
        <Toolbar
          aria-label="主题批量操作"
          className="flex flex-wrap items-end gap-3"
        >
          <Typography.Paragraph size="sm" color="muted">
            已选 {selected.length} 条
          </Typography.Paragraph>

          <Select
            selectedKey={batchAction}
            onSelectionChange={(key) => {
              if (key !== null) setBatchAction(key as ThreadAction)
            }}
          >
            <Label>批量操作</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(Object.keys(ACTION_LABELS) as ThreadAction[]).map(
                  (action) => (
                    <ListBox.Item
                      key={action}
                      id={action}
                      textValue={ACTION_LABELS[action]}
                    >
                      {ACTION_LABELS[action]}
                    </ListBox.Item>
                  ),
                )}
              </ListBox>
            </Select.Popover>
          </Select>

          {batchAction === 'move' ? (
            <Select
              selectedKey={batchBoardId || '__none__'}
              onSelectionChange={(key) => {
                setBatchBoardId(
                  key === null || key === '__none__' ? '' : String(key),
                )
              }}
            >
              <Label>目标板块</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__none__" textValue="选择目标板块">
                    选择目标板块
                  </ListBox.Item>
                  {moveBoards.map((board) => (
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

          <TextField>
            <Label>原因（可选）</Label>
            <Input
              value={batchReason}
              placeholder="写入审计日志"
              onChange={(event) => setBatchReason(event.target.value)}
            />
          </TextField>

          <PendingButton
            variant="primary"
            isPending={batchMutation.isPending}
            isDisabled={
              selected.length === 0 ||
              (batchAction === 'move' && !batchBoardId)
            }
            onPress={() => batchMutation.mutate()}
          >
            执行批量操作
          </PendingButton>
          <Button
            variant="tertiary"
            isDisabled={selected.length === 0}
            onPress={() => setSelected([])}
          >
            清空选择
          </Button>
        </Toolbar>

        {batchFailures.length > 0 ? (
          <Alert status="danger" className="mt-3">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>以下条目操作失败：</Alert.Title>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {batchFailures.map((failure) => (
                  <li key={failure.id}>
                    #{failure.id}：{failure.reason}
                  </li>
                ))}
              </ul>
            </Alert.Content>
          </Alert>
        ) : null}
      </Card>

      {threadsQuery.isPending ? (
        <LoadingPanel />
      ) : threadsQuery.isError ? (
        <ErrorPanel
          message={threadsQuery.error.message}
          onRetry={() => void threadsQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="主题列表">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="主题列表"
                selectionMode="multiple"
                selectedKeys={new Set(selected)}
                onSelectionChange={(keys) =>
                  setSelected(
                    keys === 'all'
                      ? threads.map((thread) => thread.id)
                      : [...keys].map(Number),
                  )
                }
              >
                <Table.Header>
                  <Table.Column id="select">
                    <Checkbox
                      slot="selection"
                      aria-label="选择本页全部主题"
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </Table.Column>
                  <Table.Column id="id">ID</Table.Column>
                  <Table.Column id="title" isRowHeader>
                    标题
                  </Table.Column>
                  <Table.Column id="board">板块</Table.Column>
                  <Table.Column id="author">作者</Table.Column>
                  <Table.Column id="interaction">互动</Table.Column>
                  <Table.Column id="status">状态</Table.Column>
                  <Table.Column
                    id="created"
                    className="hidden 2xl:table-cell"
                  >
                    创建时间
                  </Table.Column>
                  <Table.Column id="actions">操作</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState>没有符合条件的主题</EmptyState>
                  )}
                >
                  {threads.map((thread) => (
                    <Table.Row key={thread.id} id={thread.id}>
                      <Table.Cell>
                        <Checkbox
                          slot="selection"
                          aria-label={`选择主题 ${thread.id}`}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </Table.Cell>
                      <Table.Cell>{thread.id}</Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph
                          weight="medium"
                          truncate
                          className="max-w-xs"
                        >
                          {thread.title}
                        </Typography.Paragraph>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          truncate
                          className="max-w-xs"
                        >
                          {thread.excerpt}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>{thread.board.name}</Table.Cell>
                      <Table.Cell>
                        {thread.author ? (
                          <span className="flex items-center gap-1.5">
                            <UserAvatar user={thread.author} />
                            <span className="max-w-24 truncate">
                              {getDisplayName(thread.author)}
                            </span>
                          </span>
                        ) : (
                          <Typography.Paragraph size="sm" color="muted">
                            已注销
                          </Typography.Paragraph>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="xs" color="muted">
                          {thread.replyCount} 回复 · {thread.likeCount} 赞
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {thread.deleted ? (
                            <Chip size="sm" variant="soft" color="danger">
                              <Chip.Label>已删除</Chip.Label>
                            </Chip>
                          ) : null}
                          {thread.pinned ? (
                            <Chip size="sm" variant="soft" color="warning">
                              <Chip.Label>置顶</Chip.Label>
                            </Chip>
                          ) : null}
                          {thread.locked ? (
                            <Chip size="sm" variant="soft" color="default">
                              <Chip.Label>锁定</Chip.Label>
                            </Chip>
                          ) : null}
                          {!thread.deleted &&
                          !thread.pinned &&
                          !thread.locked ? (
                            <Chip size="sm" variant="soft" color="success">
                              <Chip.Label>正常</Chip.Label>
                            </Chip>
                          ) : null}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="hidden 2xl:table-cell">
                        <Typography.Paragraph size="xs" color="muted">
                          {formatDateTime(thread.createdAt)}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`查看主题 ${thread.id}`}
                            onPress={() => setDetailId(thread.id)}
                          >
                            <Eye className="size-3.5" />
                            详情
                          </Button>

                          {!thread.deleted &&
                          admin.can('thread.pin', thread.boardId) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={
                                thread.pinned ? '取消置顶' : '置顶主题'
                              }
                              onPress={async () => {
                                try {
                                  await adminApi.updateThread(thread.id, {
                                    pinned: !thread.pinned,
                                  })
                                  toast.success(
                                    thread.pinned ? '已取消置顶' : '已置顶',
                                  )
                                  refresh()
                                } catch (error) {
                                  toast.danger(errorText(error))
                                }
                              }}
                            >
                              {thread.pinned ? '取消置顶' : '置顶'}
                            </Button>
                          ) : null}

                          {!thread.deleted &&
                          admin.can('thread.delete_any', thread.boardId) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger"
                              aria-label="删除主题"
                              onPress={() => setReasonTarget(thread)}
                            >
                              删除
                            </Button>
                          ) : null}

                          {thread.deleted &&
                          admin.can('content.restore', thread.boardId) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="恢复主题"
                              isDisabled={restoringId === thread.id}
                              onPress={() => {
                                setRestoringId(thread.id)
                                restoreMutation.mutate(thread.id, {
                                  onSettled: () => setRestoringId(null),
                                })
                              }}
                            >
                              恢复
                            </Button>
                          ) : null}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Pagination
            page={threadsQuery.data.page}
            pageSize={threadsQuery.data.pageSize}
            total={threadsQuery.data.total}
            onChange={setPage}
          />
        </>
      )}

      {detailId !== null ? (
        <ThreadDetailDialog
          threadId={detailId}
          onClose={() => setDetailId(null)}
          onMove={(thread) => {
            setMoveTarget(thread)
            setMoveBoardId('')
          }}
          onDelete={(thread) => setReasonTarget(thread)}
        />
      ) : null}

      <ReasonDialog
        isOpen={Boolean(reasonTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReasonTarget(null)
        }}
        title={`删除主题「${reasonTarget?.title ?? ''}」？`}
        description="删除后主题会从公开列表移除，可在“已删除”筛选中恢复。"
        confirmLabel="删除主题"
        onConfirm={(reason) => {
          if (reasonTarget) {
            deleteMutation.mutate({ id: reasonTarget.id, reason })
          }
        }}
      />

      <Modal
        isOpen={Boolean(moveTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setMoveTarget(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger aria-label="关闭移动主题窗口" />
              <Modal.Header>
                <Modal.Heading>移动主题</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-3">
                <Typography.Paragraph size="sm" color="muted">
                  {moveTarget?.title}（当前：{moveTarget?.board.name}）
                </Typography.Paragraph>
                <Select
                  fullWidth
                  placeholder="选择目标板块"
                  selectedKey={moveBoardId || null}
                  onSelectionChange={(key) => {
                    setMoveBoardId(key === null ? '' : String(key))
                  }}
                >
                  <Label>目标板块</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {moveBoards
                        .filter((board) => board.id !== moveTarget?.boardId)
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
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setMoveTarget(null)}>
                  取消
                </Button>
                <PendingButton
                  variant="primary"
                  isPending={moveMutation.isPending}
                  isDisabled={!moveBoardId}
                  onPress={() => {
                    if (moveTarget) {
                      moveMutation.mutate({
                        id: moveTarget.id,
                        boardId: Number(moveBoardId),
                      })
                    }
                  }}
                >
                  移动
                </PendingButton>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}