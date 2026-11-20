import { Button, Input, Modal, toast } from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { RichTextEditor } from '@/components/editor'
import { UserAvatar } from '@/components/UserAvatar'
import { getDisplayName } from '@/lib/user'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import { ReasonDialog } from '../components/ReasonDialog'
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
              <Button
                variant="primary"
                isDisabled={saving || !contentQuery.isSuccess}
                onPress={() => void handleSave()}
              >
                保存跟帖
              </Button>
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

  function toggleSelected(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  function toggleAll() {
    setSelected((current) =>
      current.length === replies.length
        ? []
        : replies.map((reply) => reply.id),
    )
  }

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

      <Toolbar>
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="主题 ID" htmlFor="reply-thread">
            <TextInput
              id="reply-thread"
              type="number"
              min={0}
              value={threadId}
              placeholder="全部"
              onChange={(event) => {
                setThreadId(event.target.value)
                setPage(1)
              }}
            />
          </Field>

          <Field label="作者 ID" htmlFor="reply-author">
            <TextInput
              id="reply-author"
              type="number"
              min={0}
              value={authorId}
              placeholder="全部"
              onChange={(event) => {
                setAuthorId(event.target.value)
                setPage(1)
              }}
            />
          </Field>

          <Field label="状态" htmlFor="reply-status">
            <SelectInput
              id="reply-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="active">正常</option>
              <option value="deleted">已删除</option>
              <option value="all">全部</option>
            </SelectInput>
          </Field>

          <Field label="关键词" htmlFor="reply-keyword" className="min-w-52">
            <Input
              id="reply-keyword"
              fullWidth
              placeholder="正文关键词"
              value={keywordDraft}
              onChange={(event) => setKeywordDraft(event.target.value)}
            />
          </Field>

          <Button type="submit" variant="primary">
            查询
          </Button>
          <Button variant="tertiary" onPress={resetFilters}>
            重置
          </Button>
        </form>
      </Toolbar>

      <div className="mb-4 rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-sm text-muted">已选 {selected.length} 条</p>

          <Field label="批量操作" htmlFor="reply-batch-action">
            <SelectInput
              id="reply-batch-action"
              value={batchAction}
              onChange={(event) =>
                setBatchAction(event.target.value as ReplyAction)
              }
            >
              <option value="delete">删除</option>
              <option value="restore">恢复</option>
            </SelectInput>
          </Field>

          <Field label="原因（可选）" htmlFor="reply-batch-reason">
            <TextInput
              id="reply-batch-reason"
              value={batchReason}
              placeholder="写入审计日志"
              onChange={(event) => setBatchReason(event.target.value)}
            />
          </Field>

          <Button
            variant="primary"
            isDisabled={selected.length === 0 || batchMutation.isPending}
            onPress={() => batchMutation.mutate()}
          >
            执行批量操作
          </Button>
          <Button
            variant="tertiary"
            isDisabled={selected.length === 0}
            onPress={() => setSelected([])}
          >
            清空选择
          </Button>
        </div>

        {batchFailures.length > 0 ? (
          <div className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            <p className="font-medium">以下条目操作失败：</p>
            <ul className="mt-1 list-disc pl-4">
              {batchFailures.map((failure) => (
                <li key={failure.id}>
                  #{failure.id}：{failure.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {repliesQuery.isPending ? (
        <LoadingPanel />
      ) : repliesQuery.isError ? (
        <ErrorPanel
          message={repliesQuery.error.message}
          onRetry={() => void repliesQuery.refetch()}
        />
      ) : (
        <>
          <TableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH_CLASS}>
                    <input
                      type="checkbox"
                      aria-label="选择本页全部跟帖"
                      className="size-4"
                      checked={
                        replies.length > 0 &&
                        selected.length === replies.length
                      }
                      onChange={toggleAll}
                    />
                  </th>
                  <th className={TH_CLASS}>ID</th>
                  <th className={TH_CLASS}>楼层</th>
                  <th className={TH_CLASS}>主题</th>
                  <th className={TH_CLASS}>作者</th>
                  <th className={TH_CLASS}>内容</th>
                  <th className={TH_CLASS}>状态</th>
                  <th className={`${TH_CLASS} hidden 2xl:table-cell`}>时间</th>
                  <th className={TH_CLASS}>操作</th>
                </tr>
              </thead>
              <tbody>
                {replies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-10 text-center text-muted"
                    >
                      没有符合条件的跟帖
                    </td>
                  </tr>
                ) : (
                  replies.map((reply) => (
                    <tr key={reply.id}>
                      <td className={TD_CLASS}>
                        <input
                          type="checkbox"
                          aria-label={`选择跟帖 ${reply.id}`}
                          className="size-4"
                          checked={selected.includes(reply.id)}
                          onChange={() => toggleSelected(reply.id)}
                        />
                      </td>
                      <td className={TD_CLASS}>{reply.id}</td>
                      <td className={TD_CLASS}>#{reply.floor}</td>
                      <td className={TD_CLASS}>
                        <p className="max-w-40 truncate">
                          {reply.threadTitle}
                        </p>
                        <p className="text-xs text-muted">
                          主题 #{reply.threadId}
                        </p>
                      </td>
                      <td className={TD_CLASS}>
                        {reply.author ? (
                          <span className="flex items-center gap-1.5">
                            <UserAvatar user={reply.author} />
                            <span className="max-w-24 truncate">
                              {getDisplayName(reply.author)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted">已注销</span>
                        )}
                      </td>
                      <td className={TD_CLASS}>
                        <p className="max-w-xs truncate text-xs text-muted">
                          {reply.excerpt}
                        </p>
                      </td>
                      <td className={TD_CLASS}>
                        {reply.deleted ? (
                          <Badge tone="danger">已删除</Badge>
                        ) : (
                          <Badge tone="success">正常</Badge>
                        )}
                      </td>
                      <td className={`${TD_CLASS} hidden 2xl:table-cell`}>
                        <span className="text-xs text-muted">
                          {formatDateTime(reply.createdAt)}
                        </span>
                      </td>
                      <td className={TD_CLASS}>
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>

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