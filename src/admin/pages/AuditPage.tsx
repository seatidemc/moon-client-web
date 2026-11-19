import { Button, Input } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'

import { formatDateTime } from '@/lib/utils'

import { adminApi } from '../api'
import {
  ErrorPanel,
  Field,
  LoadingPanel,
  PageHeader,
  Pagination,
  TableWrap,
  TD_CLASS,
  TH_CLASS,
  TextInput,
  Toolbar,
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

      <Toolbar>
        <form
          onSubmit={applyFilters}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="操作人 ID" htmlFor="audit-actor">
            <TextInput
              id="audit-actor"
              type="number"
              min={0}
              value={actorDraft}
              placeholder="全部"
              onChange={(event) => setActorDraft(event.target.value)}
            />
          </Field>

          <Field label="动作" htmlFor="audit-action">
            <TextInput
              id="audit-action"
              value={action}
              placeholder="如 thread.update"
              onChange={(event) => setAction(event.target.value)}
            />
          </Field>

          <Field label="目标类型" htmlFor="audit-target-type">
            <TextInput
              id="audit-target-type"
              value={targetType}
              placeholder="如 thread / user / board"
              onChange={(event) => setTargetType(event.target.value)}
            />
          </Field>

          <Field label="目标 ID" htmlFor="audit-target">
            <TextInput
              id="audit-target"
              type="number"
              min={0}
              value={targetDraft}
              placeholder="全部"
              onChange={(event) => setTargetDraft(event.target.value)}
            />
          </Field>

          <Field label="起始时间" htmlFor="audit-from">
            <Input
              id="audit-from"
              type="datetime-local"
              value={fromDraft}
              onChange={(event) => setFromDraft(event.target.value)}
            />
          </Field>

          <Field label="结束时间" htmlFor="audit-to">
            <Input
              id="audit-to"
              type="datetime-local"
              value={toDraft}
              onChange={(event) => setToDraft(event.target.value)}
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

      {auditQuery.isPending ? (
        <LoadingPanel />
      ) : auditQuery.isError ? (
        <ErrorPanel
          message={auditQuery.error.message}
          onRetry={() => void auditQuery.refetch()}
        />
      ) : (
        <>
          <TableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={TH_CLASS}>时间</th>
                  <th className={TH_CLASS}>操作人</th>
                  <th className={TH_CLASS}>动作</th>
                  <th className={TH_CLASS}>目标</th>
                  <th className={TH_CLASS}>详情</th>
                  <th className={TH_CLASS}>来源</th>
                </tr>
              </thead>
              <tbody>
                {auditQuery.data.items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-10 text-center text-muted"
                    >
                      没有符合条件的审计记录
                    </td>
                  </tr>
                ) : (
                  auditQuery.data.items.map((log) => (
                    <tr key={log.id}>
                      <td className={TD_CLASS}>
                        <span className="text-xs text-muted">
                          {formatDateTime(log.createdAt)}
                        </span>
                      </td>
                      <td className={TD_CLASS}>#{log.actorId}</td>
                      <td className={TD_CLASS}>
                        <code className="text-xs">{log.action}</code>
                      </td>
                      <td className={TD_CLASS}>
                        <span className="text-xs">
                          {log.targetType} #{log.targetId || '—'}
                        </span>
                      </td>
                      <td className={TD_CLASS}>
                        <details>
                          <summary className="cursor-pointer text-xs text-accent">
                            查看
                          </summary>
                          <pre className="mt-1 max-w-md overflow-x-auto rounded bg-default-soft p-2 text-[11px] whitespace-pre-wrap">
                            {formatJsonDetail(log.detail)}
                          </pre>
                        </details>
                      </td>
                      <td className={TD_CLASS}>
                        <p className="text-xs text-muted">{log.ip || '—'}</p>
                        <p className="max-w-48 truncate text-[11px] text-muted">
                          {log.userAgent || '—'}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableWrap>

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