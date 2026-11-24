import {
  Card,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

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
          <Tooltip key={day.date} delay={0} closeDelay={0}>
            <Tooltip.Trigger className="flex min-w-8 flex-1 flex-col items-center gap-1">
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
            </Tooltip.Trigger>
            <Tooltip.Content>
              {`${day.date}：主题 ${day.threads}，跟帖 ${day.replies}，新用户 ${day.users}`}
            </Tooltip.Content>
          </Tooltip>
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
        actions={
          <ToggleButtonGroup
            aria-label="统计范围"
            size="sm"
            selectionMode="single"
            selectedKeys={[String(days)]}
            onSelectionChange={(keys) => {
              const [key] = keys
              if (key !== undefined) setDays(Number(key))
            }}
          >
            {DAY_OPTIONS.map((option) => (
              <ToggleButton key={option} id={String(option)}>
                近 {option} 天
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
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