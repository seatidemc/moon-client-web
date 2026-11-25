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
import {
  Cell,
  Label as ChartLabel,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  type TooltipContentProps,
} from 'recharts'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { mediaUrl } from '@/lib/media'
import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import {
  formatBytes,
  formatNumber,
  uploadKindLabel,
  UPLOAD_KIND_LABELS,
} from '../lib'
import { adminKeys } from '../store'
import type { AdminUpload } from '../types'

const PAGE_SIZE = 20

const KIND_OPTIONS = [
  { value: 'post', label: '主题/回复' },
  { value: 'avatar', label: '头像' },
  { value: 'background', label: '主页背景' },
]

const KIND_COLORS: Record<string, string> = {
  post: 'var(--chart-series-1)',
  avatar: 'var(--chart-series-2)',
  background: 'var(--chart-series-3)',
}

interface StorageSlice {
  key: string
  label: string
  value: number
  color: string
  count?: number
  percent: number
}

function formatPercentValue(percent: number): string {
  const value = percent * 100
  if (value > 0 && value < 0.1) return '<0.1%'
  return `${value.toFixed(1)}%`
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return '0%'
  return formatPercentValue(value / total)
}

function StorageTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null

  const slice = payload[0].payload as StorageSlice

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: slice.color }}
          aria-hidden="true"
        />
        <span className="font-medium text-foreground">{slice.label}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-muted">
        {slice.count !== undefined ? (
          <div>文件 {formatNumber(slice.count)} 个</div>
        ) : null}
        <div>
          {formatBytes(slice.value)} · {formatPercentValue(slice.percent)}
        </div>
      </div>
    </div>
  )
}

function PieCenterLabel({
  viewBox,
  value,
  caption,
}: {
  viewBox?: { cx?: number; cy?: number }
  value: string
  caption: string
}) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0

  return (
    <g>
      <text
        x={cx}
        y={cy - 3}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={16}
        fontWeight={600}
      >
        {value}
      </text>
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        fill="var(--muted)"
        fontSize={11}
      >
        {caption}
      </text>
    </g>
  )
}

function StoragePie({
  title,
  data,
  centerValue,
  centerCaption,
}: {
  title: string
  data: StorageSlice[]
  centerValue: string
  centerCaption: string
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col gap-2">
      <p className="text-center text-sm font-medium">{title}</p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="52%"
              outerRadius="80%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((slice) => (
                <Cell key={slice.key} fill={slice.color} />
              ))}
              <ChartLabel
                position="center"
                content={
                  <PieCenterLabel
                    value={centerValue}
                    caption={centerCaption}
                  />
                }
              />
            </Pie>
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              itemSorter={null}
              labelStyle={{ color: 'var(--foreground)', fontSize: 12 }}
            />
            <ChartTooltip content={StorageTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StorageStat({
  label,
  value,
  hint,
  dot,
  className,
}: {
  label: string
  value: string
  hint?: string
  dot?: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {dot ? (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: dot }}
            aria-hidden="true"
          />
        ) : null}
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold leading-tight tabular-nums">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-xs tabular-nums text-muted">{hint}</div>
      ) : null}
    </div>
  )
}

export function UploadsPage() {
  useAdminPageTitle('文件管理')
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

  const stats = statsQuery.data?.items ?? []
  const quotaBytes = statsQuery.data?.quotaBytes ?? 0
  const userQuotaBytes = statsQuery.data?.userQuotaBytes ?? 0
  const totalBytes = stats.reduce((sum, item) => sum + item.sizeBytes, 0)
  const totalCount = stats.reduce((sum, item) => sum + item.count, 0)
  const averageBytes = totalCount > 0 ? totalBytes / totalCount : 0
  const remainingBytes = quotaBytes > 0 ? Math.max(quotaBytes - totalBytes, 0) : 0
  const usedPercent = quotaBytes > 0 ? totalBytes / quotaBytes : 0

  const kindSlices: StorageSlice[] = stats.map((item) => ({
    key: item.kind,
    label: UPLOAD_KIND_LABELS[item.kind] ?? '其他',
    value: item.sizeBytes,
    color: KIND_COLORS[item.kind] ?? 'var(--muted)',
    count: item.count,
    percent: totalBytes > 0 ? item.sizeBytes / totalBytes : 0,
  }))

  const quotaSlices: StorageSlice[] =
    quotaBytes > 0
      ? [
          {
            key: 'used',
            label: '已用',
            value: Math.min(totalBytes, quotaBytes),
            color: 'var(--chart-series-1)',
            percent: Math.min(usedPercent, 1),
          },
          {
            key: 'free',
            label: '剩余',
            value: remainingBytes,
            color: 'var(--muted)',
            percent: Math.max(1 - usedPercent, 0),
          },
        ]
      : []

  return (
    <div>
      <PageHeader
        title="文件管理"
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
        <Card className="mb-4">
          <Card.Content>
            {kindSlices.length === 0 ? (
              <Typography.Paragraph size="sm" color="muted">
                暂无上传文件。
              </Typography.Paragraph>
            ) : (
              <div className="flex flex-col items-start gap-6 xl:flex-row xl:gap-10">
                <div className="flex flex-wrap justify-start gap-x-2 gap-y-6">
                  <StoragePie
                    title="用途分布"
                    data={kindSlices}
                    centerValue={formatBytes(totalBytes)}
                    centerCaption="总占用"
                  />
                  {quotaSlices.length > 0 ? (
                    <StoragePie
                      title="空间配额"
                      data={quotaSlices}
                      centerValue={formatPercentValue(usedPercent)}
                      centerCaption="已使用"
                    />
                  ) : (
                    <div className="flex w-56 shrink-0 flex-col gap-2">
                      <p className="text-center text-sm font-medium">空间配额</p>
                      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
                        未设置存储上限
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid w-full min-w-0 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 xl:flex-1 xl:grid-cols-4">
                  <StorageStat
                    label="已用空间"
                    value={formatBytes(totalBytes)}
                  />
                  <StorageStat
                    label="允许空间"
                    value={
                      quotaBytes > 0 ? formatBytes(quotaBytes) : '不限制'
                    }
                  />
                  <StorageStat
                    label="剩余空间"
                    value={
                      quotaBytes > 0
                        ? formatBytes(remainingBytes)
                        : '不限制'
                    }
                  />
                  <StorageStat
                    label="使用率"
                    value={
                      quotaBytes > 0
                        ? formatPercentValue(usedPercent)
                        : '—'
                    }
                  />
                  <StorageStat
                    label="文件总数"
                    value={`${formatNumber(totalCount)} 个`}
                  />
                  <StorageStat
                    label="平均大小"
                    value={
                      totalCount > 0 ? formatBytes(averageBytes) : '—'
                    }
                  />
                  <StorageStat
                    label="单用户配额"
                    value={
                      userQuotaBytes > 0
                        ? formatBytes(userQuotaBytes)
                        : '不限制'
                    }
                  />
                  <StorageStat
                    label="用途种类"
                    value={`${formatNumber(kindSlices.length)} 种`}
                  />
                  {kindSlices.map((slice, index) => (
                    <StorageStat
                      key={slice.key}
                      className={index === 0 ? 'col-start-1' : undefined}
                      dot={slice.color}
                      label={slice.label}
                      value={formatBytes(slice.value)}
                      hint={`${formatNumber(slice.count ?? 0)} 个 · ${formatPercent(slice.value, totalBytes)}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card.Content>
        </Card>
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