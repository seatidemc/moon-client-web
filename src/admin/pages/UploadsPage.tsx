import { Button, toast } from '@heroui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  Badge,
  Card,
  ErrorPanel,
  Field,
  LoadingPanel,
  PageHeader,
  Pagination,
  SelectInput,
  StatCard,
  TableWrap,
  TD_CLASS,
  TH_CLASS,
  TextInput,
  Toolbar,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { formatBytes, formatNumber, uploadKindLabel } from '../lib'
import { adminKeys } from '../store'
import type { AdminUpload } from '../types'

const PAGE_SIZE = 20

const KIND_OPTIONS = [
  { value: 'post', label: '主题/跟帖' },
  { value: 'avatar', label: '头像' },
  { value: 'background', label: '主页背景' },
]

export function UploadsPage() {
  useAdminPageTitle('上传文件')
  const queryClient = useQueryClient()

  const [kind, setKind] = useState('')
  const [ownerDraft, setOwnerDraft] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<AdminUpload | null>(null)

  const query = useMemo(
    () => ({
      kind: kind || undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [kind, ownerId, page],
  )

  const uploadsQuery = useQuery({
    queryKey: adminKeys.uploads(query),
    queryFn: () => adminApi.uploads(query),
  })

  const statsQuery = useQuery({
    queryKey: adminKeys.uploadStats,
    queryFn: adminApi.uploadStats,
  })

  const deleteMutation = useMutationWrapper(async (upload: AdminUpload) => {
    try {
      await adminApi.deleteUpload(upload.id)
      toast.success('上传文件已删除')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'uploads'] })
      await queryClient.invalidateQueries({ queryKey: adminKeys.uploadStats })
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : '删除失败，请稍后再试。',
      )
    }
  })

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOwnerId(ownerDraft.trim())
    setPage(1)
  }

  function resetFilters() {
    setKind('')
    setOwnerDraft('')
    setOwnerId('')
    setPage(1)
  }

  const totalBytes = (statsQuery.data?.items ?? []).reduce(
    (sum, item) => sum + item.sizeBytes,
    0,
  )

  return (
    <div>
      <PageHeader
        title="上传文件"
        description="论坛图片上传的占用统计与清理。被资料或正文引用的文件不能删除。"
      />

      {statsQuery.isPending ? (
        <LoadingPanel label="正在统计上传占用…" />
      ) : statsQuery.isError ? (
        <ErrorPanel
          message={statsQuery.error.message}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(statsQuery.data.items.length > 0
            ? statsQuery.data.items
            : []
          ).map((item) => (
            <StatCard
              key={item.kind}
              label={`${uploadKindLabel(item.kind)}（${item.kind}）`}
              value={formatNumber(item.count)}
              hint={formatBytes(item.sizeBytes)}
            />
          ))}
          <StatCard
            label="总占用"
            value={formatBytes(totalBytes)}
            hint={`共 ${formatNumber(
              statsQuery.data.items.reduce((sum, item) => sum + item.count, 0),
            )} 个文件`}
          />
        </div>
      )}

      <Toolbar>
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="用途" htmlFor="upload-kind">
            <SelectInput
              id="upload-kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value)
                setPage(1)
              }}
            >
              <option value="">全部</option>
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="上传者 ID" htmlFor="upload-owner">
            <TextInput
              id="upload-owner"
              type="number"
              min={0}
              value={ownerDraft}
              placeholder="全部"
              onChange={(event) => setOwnerDraft(event.target.value)}
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

      {uploadsQuery.isPending ? (
        <LoadingPanel />
      ) : uploadsQuery.isError ? (
        <ErrorPanel
          message={uploadsQuery.error.message}
          onRetry={() => void uploadsQuery.refetch()}
        />
      ) : (
        <>
          <TableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH_CLASS}>预览</th>
                  <th className={TH_CLASS}>文件</th>
                  <th className={TH_CLASS}>上传者</th>
                  <th className={TH_CLASS}>用途</th>
                  <th className={TH_CLASS}>大小</th>
                  <th className={TH_CLASS}>尺寸</th>
                  <th className={`${TH_CLASS} hidden 2xl:table-cell`}>上传时间</th>
                  <th className={TH_CLASS}>操作</th>
                </tr>
              </thead>
              <tbody>
                {uploadsQuery.data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-10 text-center text-muted"
                    >
                      没有符合条件的上传文件
                    </td>
                  </tr>
                ) : (
                  uploadsQuery.data.items.map((upload) => (
                    <tr key={upload.id}>
                      <td className={TD_CLASS}>
                        <a
                          href={upload.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block size-12 overflow-hidden rounded-lg border border-border bg-default"
                        >
                          <img
                            src={upload.url}
                            alt={upload.originalName || upload.key}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        </a>
                      </td>
                      <td className={TD_CLASS}>
                        <p className="max-w-64 truncate text-xs">
                          {upload.originalName || '—'}
                        </p>
                        <p className="max-w-64 truncate text-xs text-muted">
                          {upload.key}
                        </p>
                      </td>
                      <td className={TD_CLASS}>
                        <p className="max-w-32 truncate">
                          {upload.ownerName || '—'}
                        </p>
                        <p className="text-xs text-muted">#{upload.ownerId}</p>
                      </td>
                      <td className={TD_CLASS}>
                        <Badge>{uploadKindLabel(upload.kind)}</Badge>
                      </td>
                      <td className={TD_CLASS}>
                        {formatBytes(upload.sizeBytes)}
                      </td>
                      <td className={TD_CLASS}>
                        {upload.width}×{upload.height}
                      </td>
                      <td className={`${TD_CLASS} hidden 2xl:table-cell`}>
                        <span className="text-xs text-muted">
                          {formatDateTime(upload.createdAt)}
                        </span>
                      </td>
                      <td className={TD_CLASS}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          aria-label={`删除上传 ${upload.id}`}
                          onPress={() => setDeleting(upload)}
                        >
                          <Trash2 className="size-3.5" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>

          <Pagination
            page={uploadsQuery.data.page}
            pageSize={uploadsQuery.data.pageSize}
            total={uploadsQuery.data.total}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeleting(null)
        }}
        title="删除上传文件？"
        description={
          deleting
            ? `${deleting.originalName || deleting.key}。被用户资料或正文引用的文件会被后端拒绝。`
            : ''
        }
        confirmLabel="删除文件"
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting)
          setDeleting(null)
        }}
      />

      <Card className="mt-4 text-xs text-muted">
        上传占用按用途分类统计；删除只移除未被引用的文件。
      </Card>
    </div>
  )
}

/**
 * 轻量的异步动作包装，避免每个页面都重复 useMutation 的样板。
 * 这里只用于无参数状态的删除动作。
 */
function useMutationWrapper<T>(action: (value: T) => Promise<void>) {
  const [pending, setPending] = useState(false)

  return {
    isPending: pending,
    mutate: (value: T) => {
      setPending(true)
      void action(value).finally(() => setPending(false))
    },
  }
}