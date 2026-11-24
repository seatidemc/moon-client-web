import {
  Button,
  Card,
  Chip,
  EmptyState,
  Form,
  Input,
  Label,
  Link,
  ListBox,
  Select,
  Table,
  TextField,
  Toolbar,
  Typography,
  toast,
} from '@heroui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { mediaUrl } from '@/lib/media'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
  StatCard,
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

      <Card className="mb-4">
        <Toolbar
          aria-label="上传筛选"
          className="flex flex-wrap items-end gap-3"
        >
          <Form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <Select
              selectedKey={kind || '__all__'}
              onSelectionChange={(key) => {
                setKind(
                  key === null || key === '__all__' ? '' : String(key),
                )
                setPage(1)
              }}
            >
              <Label>用途</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="__all__" textValue="全部">
                    全部
                  </ListBox.Item>
                  {KIND_OPTIONS.map((option) => (
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

            <TextField>
              <Label>上传者 ID</Label>
              <Input
                type="number"
                min={0}
                value={ownerDraft}
                placeholder="全部"
                onChange={(event) => setOwnerDraft(event.target.value)}
              />
            </TextField>

            <Button type="submit" variant="primary">
              查询
            </Button>
            <Button variant="tertiary" onPress={resetFilters}>
              重置
            </Button>
          </Form>
        </Toolbar>
      </Card>

      {uploadsQuery.isPending ? (
        <LoadingPanel />
      ) : uploadsQuery.isError ? (
        <ErrorPanel
          message={uploadsQuery.error.message}
          onRetry={() => void uploadsQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="上传文件">
            <Table.ScrollContainer>
              <Table.Content aria-label="上传文件">
                <Table.Header>
                  <Table.Column id="preview" isRowHeader>
                    预览
                  </Table.Column>
                  <Table.Column id="file">文件</Table.Column>
                  <Table.Column id="owner">上传者</Table.Column>
                  <Table.Column id="kind">用途</Table.Column>
                  <Table.Column id="size">大小</Table.Column>
                  <Table.Column id="dimensions">尺寸</Table.Column>
                  <Table.Column
                    id="created"
                    className="hidden 2xl:table-cell"
                  >
                    上传时间
                  </Table.Column>
                  <Table.Column id="actions">操作</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState>没有符合条件的上传文件</EmptyState>
                  )}
                >
                  {uploadsQuery.data.items.map((upload) => (
                    <Table.Row key={upload.id} id={upload.id}>
                      <Table.Cell>
                        <Link
                          href={mediaUrl(upload.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="block size-12 overflow-hidden rounded-lg border border-border bg-default"
                        >
                          <img
                            src={mediaUrl(upload.url)}
                            alt={upload.originalName || upload.key}
                            loading="lazy"
                            className="size-full object-cover"
                          />
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph
                          size="xs"
                          className="max-w-64 truncate"
                        >
                          {upload.originalName || '—'}
                        </Typography.Paragraph>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          className="max-w-64 truncate"
                        >
                          {upload.key}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph className="max-w-32 truncate">
                          {upload.ownerName || '—'}
                        </Typography.Paragraph>
                        <Typography.Paragraph size="xs" color="muted">
                          #{upload.ownerId}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Chip size="sm" variant="soft" color="default">
                          <Chip.Label>
                            {uploadKindLabel(upload.kind)}
                          </Chip.Label>
                        </Chip>
                      </Table.Cell>
                      <Table.Cell>
                        {formatBytes(upload.sizeBytes)}
                      </Table.Cell>
                      <Table.Cell>
                        {upload.width}×{upload.height}
                      </Table.Cell>
                      <Table.Cell className="hidden 2xl:table-cell">
                        <Typography.Paragraph size="xs" color="muted">
                          {formatDateTime(upload.createdAt)}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
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
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

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

      <Card className="mt-4">
        <Card.Content>
          <Typography.Paragraph size="xs" color="muted">
            上传占用按用途分类统计；删除只移除未被引用的文件。
          </Typography.Paragraph>
        </Card.Content>
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