import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { request, type APIRequestContext } from '@playwright/test'

const BACKEND = process.env.E2E_BACKEND_URL ?? 'http://localhost:45678'
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5174'
const API = '/forum-v1'
const PASSWORD = 'e2epass'
const USERS = ['e2ealice', 'e2ebob', 'e2ecarol'] as const

const DEFAULT_PERMISSIONS = [
  'board.follow',
  'like.create',
  'notification.read_own',
  'profile.update_own',
  'reply.create',
  'reply.delete_own',
  'reply.update_own',
  'thread.create',
  'thread.delete_own',
  'thread.update_own',
  'upload.create',
]

const MODERATOR_PERMISSIONS = [
  'thread.pin',
  'thread.lock',
  'thread.update_any',
  'thread.delete_any',
  'reply.update_any',
  'reply.delete_any',
]

const BOARDS = [
  {
    slug: 'e2e-general',
    name: 'E2E 综合',
    description: '端到端测试板块',
    icon: 'message-text',
    color: '#6366f1',
  },
  {
    slug: 'e2e-other',
    name: 'E2E 其他',
    description: '无管理权限的板块',
    icon: 'coffee',
    color: '#0ea5e9',
  },
]

interface Grant {
  permissionCode: string
  boardId: number | null
}

interface AdminUser {
  id: number
  username: string
  permissions: Grant[]
}

async function reachable(url: string) {
  try {
    const context = await request.newContext()
    const response = await context.get(url, { timeout: 5000 })
    await context.dispose()
    return response.ok()
  } catch {
    return false
  }
}

async function loginOk(username: string) {
  const context = await request.newContext({ baseURL: BACKEND })
  try {
    const response = await context.post(`${API}/auth/login`, {
      data: { username, password: PASSWORD },
    })
    return response.ok()
  } finally {
    await context.dispose()
  }
}

function createUser(username: string) {
  const repo = process.env.GO_ALIYUNMC_REPO ?? path.resolve(process.cwd(), '../go-aliyunmc-v2')

  execFileSync(
    'go',
    [
      'run',
      './cmd/aliyunmc',
      'create_user',
      '--username',
      username,
      '--password',
      PASSWORD,
      '--role',
      'basic',
    ],
    {
      cwd: repo,
      env: { ...process.env, GO_ALIYUNMC_STATE_DIR: '.dev' },
      stdio: 'pipe',
    },
  )
}

async function ensureUsers() {
  for (const username of USERS) {
    if (await loginOk(username)) continue

    try {
      createUser(username)
    } catch (error) {
      const stderr =
        error && typeof error === 'object' && 'stderr' in error
          ? String(error.stderr)
          : String(error)
      throw new Error(
        `无法创建 E2E 用户 ${username}。请确认后端正在运行、数据库可用，或手动创建该用户。\n${stderr}`,
      )
    }

    if (!(await loginOk(username))) {
      throw new Error(`E2E 用户 ${username} 创建后仍无法登录。`)
    }
  }
}

async function adminLogin(): Promise<APIRequestContext> {
  const context = await request.newContext({ baseURL: BACKEND })
  const response = await context.post(`${API}/admin/auth/login`, {
    data: { username: 'dev', password: 'dev' },
  })

  if (!response.ok()) {
    await context.dispose()
    throw new Error('无法以 dev/dev 登录论坛管理 API，请确认开发用户存在。')
  }

  return context
}

async function ensureBoards(admin: APIRequestContext) {
  const listResponse = await admin.get(
    `${API}/admin/boards?includeDisabled=true&includeDeleted=true&pageSize=100`,
  )
  const list = (await listResponse.json()) as {
    data: { items: { id: number; slug: string; enabled: boolean; deleted: boolean }[] }
  }

  const result: Record<string, number> = {}

  for (const board of BOARDS) {
    const existing = list.data.items.find((item) => item.slug === board.slug)

    if (!existing) {
      const created = await admin.post(`${API}/admin/boards`, {
        data: { ...board, sortOrder: Object.keys(result).length + 1, enabled: true },
      })
      const body = (await created.json()) as { data: { id: number } }
      result[board.slug] = body.data.id
      continue
    }

    if (existing.deleted) {
      await admin.post(`${API}/admin/boards/${existing.id}/restore`)
    }
    if (existing.deleted || !existing.enabled) {
      await admin.patch(`${API}/admin/boards/${existing.id}`, {
        data: { enabled: true },
      })
    }

    result[board.slug] = existing.id
  }

  return result
}

async function ensurePermissions(
  admin: APIRequestContext,
  username: string,
  moderatorBoardId: number | null,
) {
  const response = await admin.get(
    `${API}/admin/users?keyword=${encodeURIComponent(username)}&pageSize=100`,
  )
  const body = (await response.json()) as { data: { items: AdminUser[] } }
  const user = body.data.items.find((item) => item.username === username)

  if (!user) throw new Error(`管理 API 中找不到用户 ${username}`)

  const grants = new Map<string, Grant>()
  const add = (permissionCode: string, boardId: number | null = null) => {
    grants.set(`${permissionCode}:${boardId ?? 0}`, { permissionCode, boardId })
  }

  for (const grant of user.permissions) add(grant.permissionCode, grant.boardId)
  for (const code of DEFAULT_PERMISSIONS) add(code)
  if (moderatorBoardId !== null) {
    for (const code of MODERATOR_PERMISSIONS) add(code, moderatorBoardId)
  }

  const put = await admin.put(`${API}/admin/users/${user.id}/permissions`, {
    data: { grants: [...grants.values()] },
  })
  if (!put.ok()) {
    throw new Error(
      `设置用户 ${username} 的权限失败：${put.status()} ${await put.text()}`,
    )
  }

  return user.id
}

export default async function globalSetup() {
  if (!(await reachable(`${BACKEND}${API}/site`))) {
    throw new Error(
      `后端不可用：${BACKEND}${API}/site。请先在 go-aliyunmc-v2 运行 make dev。`,
    )
  }
  if (!(await reachable(FRONTEND))) {
    throw new Error(`前端不可用：${FRONTEND}。请启动 npm run dev。`)
  }

  await ensureUsers()

  const admin = await adminLogin()
  try {
    const boardIds = await ensureBoards(admin)
    const aliceId = await ensurePermissions(admin, 'e2ealice', null)
    const bobId = await ensurePermissions(admin, 'e2ebob', null)
    const carolId = await ensurePermissions(
      admin,
      'e2ecarol',
      boardIds['e2e-general'],
    )

    fs.writeFileSync(
      path.resolve(process.cwd(), 'tests/e2e/.state.json'),
      JSON.stringify(
        {
          aliceId,
          bobId,
          carolId,
          generalBoardId: boardIds['e2e-general'],
          otherBoardId: boardIds['e2e-other'],
        },
        null,
        2,
      ),
    )
  } finally {
    await admin.dispose()
  }
}