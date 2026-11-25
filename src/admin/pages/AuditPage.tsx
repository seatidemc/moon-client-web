import {
  Button,
  Card,
  Disclosure,
  EmptyState,
  Form,
  Input,
  Label,
  Table,
  TextField,
  Toolbar,
  Typography,
} from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'

import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  Pagination,
} from '../components/ui'
import { useAdminPageTitle } from '../components/use-admin-title'
import { formatJsonDetail, toRfc3339 } from '../lib'
import { adminKeys } from '../store'

const PAGE_SIZE = 20

export function AuditPage() {
  useAdminPageTitle('审计日志')
  const [actorDraft, setActorDraft] = useState('')
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetDraft, setTargetDraft] = useState('')
  const [fromDraft, setFromDraft] = useState('')
  const [toDraft, setToDraft] = useState('')
  const [applied, setApplied] = useState({
    actorId: '',
    action: '',
    targetType: '',
    targetId: '',
    from: '',
    to: '',
  })
  const [page, setPage] = useState(1)

  const query = useMemo(
    () => ({
      actorId: applied.actorId ? Number(applied.actorId) : undefined,
      action: applied.action || undefined,
      targetType: applied.targetType || undefined,
      targetId: applied.targetId ? Number(applied.targetId) : undefined,
      from: toRfc3339(applied.from),
      to: toRfc3339(applied.to),
      page,
      pageSize: PAGE_SIZE,
    }),
    [applied, page],
  )

  const auditQuery = useQuery({
    queryKey: adminKeys.auditLogs(query),
    queryFn: () => adminApi.auditLogs(query),
  })

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied({
      actorId: actorDraft.trim(),
      action: action.trim(),
      targetType: targetType.trim(),
      targetId: targetDraft.trim(),
      from: fromDraft,
      to: toDraft,
    })
    setPage(1)
  }

  function resetFilters() {
    setActorDraft('')
    setAction('')
    setTargetType('')
    setTargetDraft('')
    setFromDraft('')
    setToDraft('')
    setApplied({
      actorId: '',
      action: '',
      targetType: '',
      targetId: '',
      from: '',
      to: '',
    })
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="审计日志"
        description="管理员写操作的留痕：操作人、目标、原因与来源地址。"
      />

      <Card className="mb-4">
        <Toolbar
          aria-label="审计筛选"
          className="flex flex-wrap items-end gap-3"
        >
          <Form
            onSubmit={applyFilters}
            className="flex flex-wrap items-end gap-3"
          >
            <TextField>
              <Label>操作人 ID</Label>
              <Input
                type="number"
                min={0}
                value={actorDraft}
                placeholder="全部"
                onChange={(event) => setActorDraft(event.target.value)}
              />
            </TextField>

            <TextField>
              <Label>动作</Label>
              <Input
                value={action}
                placeholder="如 thread.update"
                onChange={(event) => setAction(event.target.value)}
              />
            </TextField>

            <TextField>
              <Label>目标类型</Label>
              <Input
                value={targetType}
                placeholder="如 thread / user / board"
                onChange={(event) => setTargetType(event.target.value)}
              />
            </TextField>

            <TextField>
              <Label>目标 ID</Label>
              <Input
                type="number"
                min={0}
                value={targetDraft}
                placeholder="全部"
                onChange={(event) => setTargetDraft(event.target.value)}
              />
            </TextField>

            <TextField>
              <Label>起始时间</Label>
              <Input
                type="datetime-local"
                value={fromDraft}
                onChange={(event) => setFromDraft(event.target.value)}
              />
            </TextField>

            <TextField>
              <Label>结束时间</Label>
              <Input
                type="datetime-local"
                value={toDraft}
                onChange={(event) => setToDraft(event.target.value)}
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

      {auditQuery.isPending ? (
        <LoadingPanel />
      ) : auditQuery.isError ? (
        <ErrorPanel
          message={auditQuery.error.message}
          onRetry={() => void auditQuery.refetch()}
        />
      ) : (
        <>
          <Table aria-label="审计日志">
            <Table.ScrollContainer>
              <Table.Content aria-label="审计日志">
                <Table.Header>
                  <Table.Column id="time" isRowHeader>
                    时间
                  </Table.Column>
                  <Table.Column id="actor">操作人</Table.Column>
                  <Table.Column id="action">动作</Table.Column>
                  <Table.Column id="target">目标</Table.Column>
                  <Table.Column id="detail" className="min-w-96">
                    详情
                  </Table.Column>
                  <Table.Column id="source">来源</Table.Column>
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <EmptyState>没有符合条件的审计记录</EmptyState>
                  )}
                >
                  {auditQuery.data.items.map((log) => (
                    <Table.Row key={log.id} id={log.id}>
                      <Table.Cell>
                        <Typography.Paragraph size="xs" color="muted">
                          {formatDateTime(log.createdAt)}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="sm">
                          #{log.actorId}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Code className="text-xs">
                          {log.action}
                        </Typography.Code>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="xs">
                          {log.targetType} #{log.targetId || '—'}
                        </Typography.Paragraph>
                      </Table.Cell>
                      <Table.Cell>
                        <Disclosure>
                          <Disclosure.Heading>
                            <Disclosure.Trigger className="text-xs text-accent">
                              查看
                              <Disclosure.Indicator />
                            </Disclosure.Trigger>
                          </Disclosure.Heading>
                          <Disclosure.Content>
                            <Disclosure.Body>
                              <pre className="mt-1 w-full max-w-2xl overflow-x-auto rounded bg-default-soft p-2 text-[11px] whitespace-pre-wrap break-words">
                                {formatJsonDetail(log.detail)}
                              </pre>
                            </Disclosure.Body>
                          </Disclosure.Content>
                        </Disclosure>
                      </Table.Cell>
                      <Table.Cell>
                        <Typography.Paragraph size="xs" color="muted">
                          {log.ip || '—'}
                        </Typography.Paragraph>
                        <Typography.Paragraph
                          size="xs"
                          color="muted"
                          className="max-w-48 truncate"
                        >
                          {log.userAgent || '—'}
                        </Typography.Paragraph>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          <Pagination
            page={auditQuery.data.page}
            pageSize={auditQuery.data.pageSize}
            total={auditQuery.data.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}