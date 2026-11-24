import {
  Button,
  Card,
  Checkbox,
  Chip,
  ColorSwatch,
  Description,
  EmptyState,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Table,
  TextField,
  Toolbar,
  Typography,
  parseColor,
  toast,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PendingButton } from '@/components/PendingButton'

import { adminApi, type BoardInput } from '../api'
import { BOARD_ICON_OPTIONS } from '../lib'
import { adminKeys, useAdmin } from '../store'
import { useAdminPageTitle } from '../components/use-admin-title'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import type { AdminBoard } from '../types'

const PAGE_SIZE = 100

interface BoardFormState {
  slug: string
  name: string
  description: string
  icon: string
  color: string
  sortOrder: string
  enabled: boolean
}

const EMPTY_FORM: BoardFormState = {
  slug: '',
  name: '',
  description: '',
  icon: 'discussion',
  color: '#6366f1',
  sortOrder: '0',
  enabled: true,
}

function formFromBoard(board: AdminBoard): BoardFormState {
  return {
    slug: board.slug,
    name: board.name,
    description: board.description,
    icon: board.icon,
    color: board.color,
    sortOrder: String(board.sortOrder),
    enabled: board.enabled,
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后再试。'
}

function BoardFormDialog({
  open,
  board,
  onClose,
  onSaved,
}: {
  open: boolean
  board: AdminBoard | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<BoardFormState>(
    board ? formFromBoard(board) : EMPTY_FORM,
  )
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof BoardFormState>(
    key: K,
    value: BoardFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (!form.name.trim()) {
      toast.danger('板块名称不能为空。')
      return
    }
    if (!board && !form.slug.trim()) {
      toast.danger('slug 不能为空。')
      return
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) {
      toast.danger('颜色必须是 #RRGGBB 格式。')
      return
    }

    const input: BoardInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      icon: form.icon,
      color: form.color,
      sortOrder: Number(form.sortOrder) || 0,
      enabled: form.enabled,
    }

    setSubmitting(true)
    try {
      if (board) {
        await adminApi.updateBoard(board.id, input)
        toast.success('板块已更新')
      } else {
        await adminApi.createBoard({ ...input, slug: form.slug.trim() })
        toast.success('板块已创建')
      }
      onSaved()
      onClose()
    } catch (mutationError) {
      toast.danger(errorText(mutationError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭板块表单" />
            <Form onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>
                  {board ? `编辑板块 · ${board.name}` : '新建板块'}
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <TextField
                  fullWidth
                  isDisabled={Boolean(board)}
                >
                  <Label>slug</Label>
                  <Input
                    value={form.slug}
                    placeholder="general"
                    onChange={(event) => update('slug', event.target.value)}
                  />
                  <Description>
                    {board
                      ? 'slug 创建后不可修改。'
                      : '小写字母、数字和连字符，1~64 个字符。'}
                  </Description>
                </TextField>

                <TextField fullWidth>
                  <Label>名称</Label>
                  <Input
                    value={form.name}
                    placeholder="综合讨论"
                    onChange={(event) => update('name', event.target.value)}
                  />
                </TextField>

                <TextField fullWidth>
                  <Label>描述</Label>
                  <Input
                    value={form.description}
                    placeholder="板块的简短介绍"
                    onChange={(event) =>
                      update('description', event.target.value)
                    }
                  />
                </TextField>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    selectedKey={form.icon}
                    onSelectionChange={(key) => {
                      if (key !== null) update('icon', String(key))
                    }}
                  >
                    <Label>图标</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {BOARD_ICON_OPTIONS.map((option) => (
                          <ListBox.Item
                            key={option.value}
                            id={option.value}
                            textValue={option.label}
                          >
                            {option.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <TextField fullWidth>
                    <Label>颜色</Label>
                    <Input
                      value={form.color}
                      placeholder="#6366f1"
                      onChange={(event) => update('color', event.target.value)}
                    />
                  </TextField>
                </div>

                <div className="grid grid-cols-2 items-end gap-3">
                  <TextField fullWidth>
                    <Label>排序</Label>
                    <Input
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) =>
                        update('sortOrder', event.target.value)
                      }
                    />
                  </TextField>
                  <Checkbox
                    isSelected={form.enabled}
                    onChange={(isSelected) => update('enabled', isSelected)}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label>启用板块</Label>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button variant="tertiary" onPress={onClose}>
                  取消
                </Button>
                <PendingButton
                  type="submit"
                  variant="primary"
                  isPending={submitting}
                >
                  {board ? '保存修改' : '创建板块'}
                </PendingButton>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export function BoardsPage() {
  useAdminPageTitle('板块管理')
  const admin = useAdmin()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [showDisabled, setShowDisabled] = useState(true)
  const [showDeleted, setShowDeleted] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminBoard | null>(null)
  const [deleting, setDeleting] = useState<AdminBoard | null>(null)

  const boardsQuery = useQuery({
    queryKey: adminKeys.boards({
      includeDisabled: true,
      includeDeleted: true,
      page,
      pageSize: PAGE_SIZE,
    }),
    queryFn: () =>
      adminApi.boards({
        includeDisabled: true,
        includeDeleted: true,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const visibleBoards = (boardsQuery.data?.items ?? []).filter((board) => {
    if (board.deleted && !showDeleted) return false
    if (!board.enabled && !showDisabled) return false
    return true
  })
  // 软删除板块不能再更新 sort_order；排序时只提交未删除的板块。
  const reorderableBoards = visibleBoards.filter((board) => !board.deleted)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'boards'] })
    await queryClient.invalidateQueries({ queryKey: ['admin', 'permission-users'] })
  }

  const toggleMutation = useMutation({
    mutationFn: (board: AdminBoard) =>
      adminApi.updateBoard(board.id, { enabled: !board.enabled }),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('板块状态已更新')
      await refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (board: AdminBoard) => adminApi.deleteBoard(board.id),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('板块已删除')
      await refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const restoreMutation = useMutation({
    mutationFn: (board: AdminBoard) => adminApi.restoreBoard(board.id),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('板块已恢复')
      await refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => adminApi.reorderBoards(ids),
    meta: { skipGlobalError: true },
    onSuccess: async () => {
      toast.success('板块顺序已保存')
      await refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  function moveBoard(boardId: number, direction: -1 | 1) {
    const boards = [...reorderableBoards]
    const index = boards.findIndex((board) => board.id === boardId)
    const target = index + direction
    if (index < 0 || target < 0 || target >= boards.length) return
    const [item] = boards.splice(index, 1)
    boards.splice(target, 0, item)
    reorderMutation.mutate(boards.map((board) => board.id))
  }

  const canCreate = admin.canGlobal('board.create')
  const canDelete = admin.canGlobal('board.delete')
  const canReorder = admin.canGlobal('board.reorder')

  return (
    <div>
      <PageHeader
        title="板块管理"
        description="创建、排序、启停与恢复论坛板块。slug 创建后不可修改。"
        actions={
          canCreate ? (
            <Button
              variant="primary"
              onPress={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
              新建板块
            </Button>
          ) : null
        }
      />

      <Card className="mb-4">
        <Toolbar
          aria-label="板块筛选"
          className="flex flex-wrap items-center gap-3"
        >
          <Checkbox isSelected={showDisabled} onChange={setShowDisabled}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>显示已停用</Label>
            </Checkbox.Content>
          </Checkbox>
          <Checkbox isSelected={showDeleted} onChange={setShowDeleted}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Label>显示已删除</Label>
            </Checkbox.Content>
          </Checkbox>
          <Typography.Paragraph size="xs" color="muted" className="ml-auto">
            共 {boardsQuery.data?.total ?? 0} 个可见板块
          </Typography.Paragraph>
        </Toolbar>
      </Card>

      {boardsQuery.isPending ? (
        <LoadingPanel />
      ) : boardsQuery.isError ? (
        <ErrorPanel
          message={boardsQuery.error.message}
          onRetry={() => void boardsQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="板块列表">
            <Table.ScrollContainer>
              <Table.Content aria-label="板块列表">
                <Table.Header>
                  <Table.Column id="sort">排序</Table.Column>
                  <Table.Column id="board" isRowHeader>
                    板块
                  </Table.Column>
                  <Table.Column id="status">状态</Table.Column>
                  <Table.Column id="threads">主题数</Table.Column>
                  <Table.Column id="actions">操作</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => <EmptyState>暂无板块</EmptyState>}
                >
                  {visibleBoards.map((board) => {
                    const reorderIndex = reorderableBoards.findIndex(
                      (item) => item.id === board.id,
                    )
                    return (
                      <Table.Row key={board.id} id={board.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            <Typography.Paragraph
                              size="xs"
                              color="muted"
                              className="w-6"
                            >
                              {board.sortOrder}
                            </Typography.Paragraph>
                            {canReorder ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`上移板块 ${board.name}`}
                                  isDisabled={reorderIndex <= 0}
                                  onPress={() => moveBoard(board.id, -1)}
                                >
                                  <ArrowUp className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`下移板块 ${board.name}`}
                                  isDisabled={
                                    reorderIndex < 0 ||
                                    reorderIndex >=
                                      reorderableBoards.length - 1
                                  }
                                  onPress={() => moveBoard(board.id, 1)}
                                >
                                  <ArrowDown className="size-3.5" />
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <ColorSwatch
                              color={parseColor(board.color)}
                              shape="circle"
                              size="sm"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <Typography.Paragraph
                                weight="medium"
                                truncate
                              >
                                {board.name}
                              </Typography.Paragraph>
                              <Typography.Paragraph
                                size="xs"
                                color="muted"
                              >
                                {board.slug} · {board.icon}
                              </Typography.Paragraph>
                              {board.description ? (
                                <Typography.Paragraph
                                  size="xs"
                                  color="muted"
                                  truncate
                                  className="max-w-md"
                                >
                                  {board.description}
                                </Typography.Paragraph>
                              ) : null}
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {board.deleted ? (
                              <Chip size="sm" variant="soft" color="danger">
                                <Chip.Label>已删除</Chip.Label>
                              </Chip>
                            ) : board.enabled ? (
                              <Chip size="sm" variant="soft" color="success">
                                <Chip.Label>启用</Chip.Label>
                              </Chip>
                            ) : (
                              <Chip size="sm" variant="soft" color="warning">
                                <Chip.Label>已停用</Chip.Label>
                              </Chip>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>{board.threadCount}</Table.Cell>
                        <Table.Cell>
                          <div className="flex flex-wrap gap-1">
                            {!board.deleted &&
                            admin.can('board.update', board.id) ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`编辑板块 ${board.name}`}
                                  onPress={() => {
                                    setEditing(board)
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="size-3.5" />
                                  编辑
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`${board.enabled ? '停用' : '启用'}板块 ${board.name}`}
                                  isDisabled={toggleMutation.isPending}
                                  onPress={() => toggleMutation.mutate(board)}
                                >
                                  {board.enabled ? '停用' : '启用'}
                                </Button>
                              </>
                            ) : null}

                            {!board.deleted && canDelete ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger"
                                aria-label={`删除板块 ${board.name}`}
                                onPress={() => setDeleting(board)}
                              >
                                <Trash2 className="size-3.5" />
                                删除
                              </Button>
                            ) : null}

                            {board.deleted && canDelete ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`恢复板块 ${board.name}`}
                                isDisabled={restoreMutation.isPending}
                                onPress={() => restoreMutation.mutate(board)}
                              >
                                <RotateCcw className="size-3.5" />
                                恢复
                              </Button>
                            ) : null}
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Pagination
            page={boardsQuery.data.page}
            pageSize={boardsQuery.data.pageSize}
            total={boardsQuery.data.total}
            onChange={setPage}
          />
        </>
      )}

      {dialogOpen ? (
        <BoardFormDialog
          open={dialogOpen}
          board={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => void refresh()}
        />
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleting(null)
        }}
        title={`删除板块「${deleting?.name ?? ''}」？`}
        description="板块必须没有主题才能删除。删除后可从“显示已删除”中恢复。"
        confirmLabel="删除板块"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting)
          setDeleting(null)
        }}
      />
    </div>
  )
}