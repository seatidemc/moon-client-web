import {
  Card,
  Table,
  Tabs,
  Typography,
} from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

import { formatNumber } from '../lib'
import { adminKeys } from '../store'
import { useAdminPageTitle } from '../components/use-admin-title'
import { adminApi } from '../api'
import {
  ErrorPanel,
  LoadingPanel,
  PageHeader,
  StatCard,
} from '../components/ui'
import type { DashboardTrend } from '../types'

const DAY_OPTIONS = [7, 14, 30]

const SERIES = [
  { key: 'threads', name: '主题', color: 'var(--accent)', opacity: 1 },
  { key: 'replies', name: '跟帖', color: 'var(--foreground)', opacity: 0.4 },
  { key: 'users', name: '新用户', color: 'var(--foreground)', opacity: 0.15 },
] as const

function TrendTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-36 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => {
          const series = SERIES.find((entry) => entry.key === item.dataKey)
          if (!series) return null

          return (
            <div key={series.key} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: series.color,
                  opacity: series.opacity,
                }}
                aria-hidden="true"
              />
              <span className="text-muted">{series.name}</span>
              <span className="ml-auto tabular-nums text-foreground">
                {formatNumber(Number(item.value ?? 0))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TrendChart({ trend }: { trend: DashboardTrend[] }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-muted">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: series.color,
                opacity: series.opacity,
              }}
              aria-hidden="true"
            />
            {series.name}
          </span>
        ))}
      </div>

      <div className="h-44 w-full" role="img" aria-label="按天新增趋势">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={trend}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap="25%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => value.slice(5)}
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              width={36}
              allowDecimals={false}
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatNumber(value)}
            />
            <ChartTooltip
              content={TrendTooltip}
              cursor={{ fill: 'var(--default)', fillOpacity: 0.6 }}
            />
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.name}
                fill={series.color}
                fillOpacity={series.opacity}
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
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
        actions={
          <Tabs
            className="w-fit"
            selectedKey={String(days)}
            onSelectionChange={(key) => setDays(Number(key))}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="统计范围">
                {DAY_OPTIONS.map((option) => (
                  <Tabs.Tab
                    key={option}
                    id={String(option)}
                    className="whitespace-nowrap"
                  >
                    近 {option} 天
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        }
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
            <Typography.Heading
              level={2}
              className="mb-2 text-sm font-medium text-muted"
            >
              总量
            </Typography.Heading>
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
            <Card.Header className="flex flex-row items-center justify-between gap-2">
              <Card.Title>新增趋势</Card.Title>
              <Typography.Paragraph size="xs" color="muted">
                截至 {dashboardQuery.data.trend.at(-1)?.date ?? '—'}
              </Typography.Paragraph>
            </Card.Header>
            <Card.Content>
              <TrendChart trend={dashboardQuery.data.trend} />
            </Card.Content>
          </Card>

          <section aria-label="每日明细">
            <Typography.Heading
              level={2}
              className="mb-2 text-sm font-medium text-muted"
            >
              每日明细
            </Typography.Heading>
            <Table aria-label="每日明细">
              <Table.ScrollContainer>
                <Table.Content aria-label="每日明细">
                  <Table.Header>
                    <Table.Column id="date" isRowHeader>
                      日期
                    </Table.Column>
                    <Table.Column id="threads" className="text-right">
                      主题
                    </Table.Column>
                    <Table.Column id="replies" className="text-right">
                      跟帖
                    </Table.Column>
                    <Table.Column id="users" className="text-right">
                      新用户
                    </Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {[...dashboardQuery.data.trend]
                      .reverse()
                      .map((day) => (
                        <Table.Row key={day.date} id={day.date}>
                          <Table.Cell>{day.date}</Table.Cell>
                          <Table.Cell className="text-right">
                            {formatNumber(day.threads)}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {formatNumber(day.replies)}
                          </Table.Cell>
                          <Table.Cell className="text-right">
                            {formatNumber(day.users)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </section>
        </div>
      )}
    </div>
  )
}