import { Button } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { formatNumber } from '../lib'
import { adminKeys } from '../store'
import { useAdminPageTitle } from '../components/use-admin-title'
import { adminApi } from '../api'
import {
  Card,
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StatCard,
} from '../components/ui'
import type { DashboardTrend } from '../types'

const DAY_OPTIONS = [7, 14, 30]

function TrendChart({ trend }: { trend: DashboardTrend[] }) {
  const max = Math.max(
    1,
    ...trend.map((day) => Math.max(day.threads, day.replies, day.users)),
  )

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          主题
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full bg-foreground/40"
            aria-hidden="true"
          />
          跟帖
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-full bg-foreground/15"
            aria-hidden="true"
          />
          新用户
        </span>
      </div>

      <div
        className="flex h-44 items-end gap-1 overflow-x-auto"
        role="img"
        aria-label="按天新增趋势"
      >
        {trend.map((day) => (
          <div
            key={day.date}
            className="flex min-w-8 flex-1 flex-col items-center gap-1"
            title={`${day.date}：主题 ${day.threads}，跟帖 ${day.replies}，新用户 ${day.users}`}
          >
            <div className="flex h-36 items-end gap-0.5">
              <span
                className="w-1.5 rounded-t bg-accent"
                style={{ height: `${(day.threads / max) * 100}%` }}
              />
              <span
                className="w-1.5 rounded-t bg-foreground/40"
                style={{ height: `${(day.replies / max) * 100}%` }}
              />
              <span
                className="w-1.5 rounded-t bg-foreground/15"
                style={{ height: `${(day.users / max) * 100}%` }}
              />
            </div>
            <span className="text-[10px] whitespace-nowrap text-muted">
              {day.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardPage() {
  useAdminPageTitle('数据看板')
  const [days, setDays] = useState(7)

  const dashboardQuery = useQuery({
    queryKey: adminKeys.dashboard(days),
    queryFn: () => adminApi.dashboard(days),
  })

  return (
    <div>
      <PageHeader
        title="数据看板"
        description="论坛内容、用户与板块的实时概览。"
        actions={DAY_OPTIONS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={option === days ? 'primary' : 'tertiary'}
            aria-pressed={option === days}
            onPress={() => setDays(option)}
          >
            近 {option} 天
          </Button>
        ))}
      />

      {dashboardQuery.isPending ? (
        <LoadingPanel />
      ) : dashboardQuery.isError ? (
        <ErrorPanel
          message={dashboardQuery.error.message}
          onRetry={() => void dashboardQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <section aria-label="总量">
            <h2 className="mb-2 text-sm font-medium text-muted">总量</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="主题"
                value={formatNumber(dashboardQuery.data.totals.threads)}
                hint={`今日 +${formatNumber(dashboardQuery.data.today.threads)}`}
              />
              <StatCard
                label="跟帖"
                value={formatNumber(dashboardQuery.data.totals.replies)}
                hint={`今日 +${formatNumber(dashboardQuery.data.today.replies)}`}
              />
              <StatCard
                label="用户"
                value={formatNumber(dashboardQuery.data.totals.users)}
                hint={`今日 +${formatNumber(dashboardQuery.data.today.users)}`}
              />
              <StatCard
                label="板块"
                value={formatNumber(dashboardQuery.data.totals.boards)}
                hint={`今日 +${formatNumber(dashboardQuery.data.today.boards)}`}
              />
            </div>
          </section>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">新增趋势</h2>
              <p className="text-xs text-muted">
                截至 {dashboardQuery.data.trend.at(-1)?.date ?? '—'}
              </p>
            </div>
            <TrendChart trend={dashboardQuery.data.trend} />
          </Card>

          <section aria-label="每日明细">
            <h2 className="mb-2 text-sm font-medium text-muted">每日明细</h2>
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted">
                      日期
                    </th>
                    <th className="border-b border-border px-3 py-2 text-right text-xs font-medium text-muted">
                      主题
                    </th>
                    <th className="border-b border-border px-3 py-2 text-right text-xs font-medium text-muted">
                      跟帖
                    </th>
                    <th className="border-b border-border px-3 py-2 text-right text-xs font-medium text-muted">
                      新用户
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...dashboardQuery.data.trend].reverse().map((day) => (
                    <tr key={day.date}>
                      <td className="border-b border-separator px-3 py-2">
                        {day.date}
                      </td>
                      <td className="border-b border-separator px-3 py-2 text-right">
                        {formatNumber(day.threads)}
                      </td>
                      <td className="border-b border-separator px-3 py-2 text-right">
                        {formatNumber(day.replies)}
                      </td>
                      <td className="border-b border-separator px-3 py-2 text-right">
                        {formatNumber(day.users)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}