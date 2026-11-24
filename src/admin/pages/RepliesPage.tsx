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
  Table,
  TextField,
  Toolbar,
  Typography,
  toast,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PendingButton } from '@/components/PendingButton'
import { RichTextEditor } from '@/components/editor'
import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import { ReasonDialog } from '../components/ReasonDialog'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { adminKeys, useAdmin } from '../store'
import type { AdminReply, BatchFailure } from '../types'

const PAGE_SIZE = 20

/** 后台跟帖详情返回完整正文；列表接口仍只返回摘要以保持轻量。 */

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后再试。'
}

type ReplyAction = 'delete' | 'restore'

function EditReplyDialog({
  reply,
  onClose,
  onSaved,
}: {
  reply: AdminReply
  onClose: () => void
  onSaved: () => void
}) {
  const [content, setContent] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)

  const contentQuery = useQuery({
    queryKey: adminKeys.reply(reply.id),
    queryFn: async () => (await adminApi.reply(reply.id)).contentHtml ?? '',
    retry: false,
  })

  if (contentQuery.isSuccess && !initialized) {
    setContent(contentQuery.data)
    setInitialized(true)
  }

  async function handleSave() {
    if (saving) return
    if (!content.replace(/<[^>]*>/g, '').trim()) {
      toast.danger('跟帖正文不能为空。')
      return
    }

    setSaving(true)
    try {
      await adminApi.updateReply(reply.id, content)
      toast.success('跟帖已保存')
      onSaved()
      onClose()
    } catch (mutationError) {
      toast.danger(errorText(mutationError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭跟帖编辑" />
            <Modal.Header>
              <Modal.Heading>
                编辑跟帖 · {reply.threadTitle} #{reply.floor}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3">
              {contentQuery.isPending ? (
                <LoadingPanel label="正在读取跟帖正文…" />
              ) : contentQuery.isError ? (
                <ErrorPanel
                  message={contentQuery.error.message}
                  onRetry={() => void contentQuery.refetch()}
                />
              ) : (
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  ariaLabel="跟帖正文"
                  advanced={false}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                取消
              </Button>
              <PendingButton
                variant="primary"
                isPending={saving}
                isDisabled={!contentQuery.isSuccess}
                onPress={() => void handleSave()}
              >
                保存跟帖
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export function RepliesPage() {
  useAdminPageTitle('跟帖管理')
  const admin = useAdmin()
  const queryClient = useQueryClient()

  const [threadId, setThreadId] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [status, setStatus] = useState('active')
  const [keywordDraft, setKeywordDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState<number[]>([])
  const [batchAction, setBatchAction] = useState<ReplyAction>('delete')
  const [batchReason, setBatchReason] = useState('')
  const [batchFailures, setBatchFailures] = useState<BatchFailure[]>([])

  const [editing, setEditing] = useState<AdminReply | null>(null)
  const [reasonTarget, setReasonTarget] = useState<AdminReply | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const query = useMemo(
    () => ({
      threadId: threadId ? Number(threadId) : undefined,
      authorId: authorId ? Number(authorId) : undefined,
      status,
      keyword: keyword || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [authorId, keyword, page, status, threadId],
  )

  const repliesQuery = useQuery({
    queryKey: adminKeys.replies(query),
    queryFn: () => adminApi.replies(query),
  })

  const replies = repliesQuery.data?.items ?? []

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'replies'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'threads'] })
  }

  const deleteMutation = useMutation({
    mutationFn: (input: { id: number; reason: string }) =>
      adminApi.deleteReply(input.id, input.reason || undefined),
    meta: { skipGlobalError: true },
    onSuccess: () => {
      toast.success('跟帖已删除')
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => adminApi.restoreReply(id),
    meta: { skipGlobalError: true },
    onSuccess: () => {
      toast.success('跟帖已恢复')
      refresh()
    },
    onError: (error) => toast.danger(errorText(error)),
  })

  const batchMutation = useMutation({
    mutationFn: () =>
      adminApi.batchReplies({
        ids: selected,
        action: batchAction,
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
    setThreadId('')
    setAuthorId('')
    setStatus('active')
    setKeywordDraft('')
    setKeyword('')
    setPage(1)
  }

  const canEdit = admin.hasAnyScope('reply.update_any')
  const canDelete = admin.hasAnyScope('reply.delete_any')
  const canRestore = admin.hasAnyScope('content.restore')

  return (
    <div>
      <PageHeader
        title="跟帖管理"
        description="按主题、作者与关键词筛选跟帖，编辑正文或删除/恢复。"
      />

      <Card className="mb-4">
        <Toolbar
          aria-label="跟帖筛选"
          className="flex flex-wrap items-end gap-3"
        >
          <Form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <TextField>
              <Label>主题 ID</Label>
              <Input
                type="number"
                min={0}
                value={threadId}
                placeholder="全部"
                onChange={(event) => {
                  setThreadId(event.target.value)
                  setPage(1)
                }}
              />
            </TextField>

            <TextField>
              <Label>作者 ID</Label>
              <Input
                type="number"
                min={0}
                value={authorId}
                placeholder="全部"
                onChange={(event) => {
                  setAuthorId(event.target.value)
                  setPage(1)
                }}
              />
            </TextField>

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

            <SearchField
              fullWidth
              className="min-w-52"
              value={keywordDraft}
              onChange={setKeywordDraft}
            >
              <Label>关键词</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="正文关键词" />
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
          aria-label="跟帖批量操作"
          className="flex flex-wrap items-end gap-3"
        >
          <Typography.Paragraph size="sm" color="muted">
            已选 {selected.length} 条
          </Typography.Paragraph>

          <Select
            selectedKey={batchAction}
            onSelectionChange={(key) => {
              if (key !== null) setBatchAction(key as ReplyAction)
            }}
          >
            <Label>批量操作</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="delete" textValue="删除">
                  删除
                </ListBox.Item>
                <ListBox.Item id="restore" textValue="恢复">
                  恢复
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

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
            isDisabled={selected.length === 0}
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

      {repliesQuery.isPending ? (
        <LoadingPanel />
      ) : repliesQuery.isError ? (
        <ErrorPanel
          message={repliesQuery.error.message}
          onRetry={() => void repliesQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="跟帖列表">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="跟帖列表"
                selectionMode="multiple"
                selectedKeys={new Set(selected)}
                onSelectionChange={(keys) =>
                  setSelected(
                    keys === 'all'
                      ? replies.map((reply) => reply.id)
                      : [...keys].map(Number),
                  )
                }
              >
                <Table.Header>
                  <Table.Column id="select">
                    <Checkbox
                      slot="selection"
                      aria-label="选择本页全部跟帖"
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                      </Checkbox.Content>
                    </Checkbox>
                  </Table.Column>
                  <Table.Column id="id">ID</Table.Column>
                  <Table.Column id="floor">楼层</Table.Column>
                  <Table.Column id="thread" isRowHeader>
                    主题
                  </Table.Column>
                  <Table.Column id="author">作者</Table.Column>
                  <Table.Column id="content">内容</Table.Column>
                  <Table.Column id="status">状态</Table.Column>
                  <Table.Column
                    id="created"
                    className="hidden 2xl:table-cell"
                  >
                    时间
                  </Table.Column>
                  <Table.Column id="actions">操作</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState>没有符合条件的跟帖</EmptyState>
                  )}
                >
                  {replies.map((reply) => (
                    <Table.Row key={reply.id} id={reply.id}>
                      <Table.Cell>
                        <Checkbox
                          slot="selection"
                          aria-label={`选择跟帖 ${reply.id}`}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </Table.Cell>
                      <Table.Cell>{reply.id}</Table.Cell>
                      <Table.Cell>#{reply.floor}</Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph
                          truncate
                          className="max-w-40"
                        >
                          {reply.threadTitle}
                        </Typography.Paragraph>
                        <Typography.Paragraph size="xs" color="muted">
                          主题 #{reply.threadId}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        {reply.author ? (
                          <span className="flex items-center gap-1.5">
                            <UserAvatar user={reply.author} />
                            <span className="max-w-24 truncate">
                              {getDisplayName(reply.author)}
                            </span>
                          </span>
                        ) : (
                          <Typography.Paragraph size="sm" color="muted">
                            已注销
                          </Typography.Paragraph>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          truncate
                          className="max-w-xs"
                        >
                          {reply.excerpt}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        {reply.deleted ? (
                          <Chip size="sm" variant="soft" color="danger">
                            <Chip.Label>已删除</Chip.Label>
                          </Chip>
                        ) : (
                          <Chip size="sm" variant="soft" color="success">
                            <Chip.Label>正常</Chip.Label>
                          </Chip>
                        )}
                      </Table.Cell>
                      <Table.Cell className="hidden 2xl:table-cell">
                        <Typography.Paragraph size="xs" color="muted">
                          {formatDateTime(reply.createdAt)}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-wrap gap-1">
                          {!reply.deleted && canEdit ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="编辑跟帖"
                              onPress={() => setEditing(reply)}
                            >
                              <Pencil className="size-3.5" />
                              编辑
                            </Button>
                          ) : null}

                          {!reply.deleted && canDelete ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger"
                              aria-label="删除跟帖"
                              onPress={() => setReasonTarget(reply)}
                            >
                              <Trash2 className="size-3.5" />
                              删除
                            </Button>
                          ) : null}

                          {reply.deleted && canRestore ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="恢复跟帖"
                              isDisabled={restoringId === reply.id}
                              onPress={() => {
                                setRestoringId(reply.id)
                                restoreMutation.mutate(reply.id, {
                                  onSettled: () => setRestoringId(null),
                                })
                              }}
                            >
                              <RotateCcw className="size-3.5" />
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
            page={repliesQuery.data.page}
            pageSize={repliesQuery.data.pageSize}
            total={repliesQuery.data.total}
            onChange={setPage}
          />
        </>
      )}

      {editing ? (
        <EditReplyDialog
          reply={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}

      <ReasonDialog
        isOpen={Boolean(reasonTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setReasonTarget(null)
        }}
        title={`删除跟帖 #${reasonTarget?.floor ?? ''}？`}
        description="删除后保留楼层占位，可在“已删除”筛选中恢复。"
        confirmLabel="删除跟帖"
        onConfirm={(reason) => {
          if (reasonTarget) {
            deleteMutation.mutate({ id: reasonTarget.id, reason })
          }
        }}
      />
    </div>
  )
}