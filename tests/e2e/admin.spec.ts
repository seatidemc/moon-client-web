import fs from 'node:fs'
import path from 'node:path'

import {
  expect,
  request,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'

/**
 * 管理后台（/admin.html）端到端测试。
 *
 * 使用真实后端与真实前端：
 * - dev/dev 是开发超级管理员，用于覆盖全部后台能力；
 * - e2ecarol 被授予 e2e-general 的板块级后台权限，用于验证板块隔离；
 * - 测试数据通过公开 API / 管理 API 准备，不依赖其他测试文件。
 */

const BACKEND = process.env.E2E_BACKEND_URL ?? 'http://localhost:45678'
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:5174'
const API = '/forum-v1'
const PASSWORD = 'e2epass'

const RUN = Date.now().toString(36)
const THREAD_TITLE = `后台 E2E 主题 ${RUN}`
const SECOND_TITLE = `后台 E2E 批量主题 ${RUN}`
const OTHER_TITLE = `后台 E2E 其他板块主题 ${RUN}`
const REPLY_THREAD_TITLE = `后台 E2E 跟帖主题 ${RUN}`
const THREAD_TEXT = `后台主题正文 ${RUN}`
const REPLY_TEXT = `后台跟帖正文 ${RUN}`
const UPLOAD_NAME = `e2e-admin-upload-${RUN}.png`
const BOARD_SLUG = `e2e-admin-${RUN}`
const BOARD_NAME = `后台板块 ${RUN}`
const BOARD_DESCRIPTION = `后台 E2E 板块描述 ${RUN}`

interface Board {
  id: number
  slug: string
  name: string
  enabled: boolean
  deleted: boolean
}

let adminPage: Page
let adminContext: BrowserContext
let adminApiContext: APIRequestContext
let forumApiContext: APIRequestContext
let generalBoardId = 0
let otherBoardId = 0
let threadId = 0
let secondThreadId = 0
let replyThreadId = 0
let replyId = 0
let uploadId = 0

const fixture = (name: string) =>
  path.resolve(process.cwd(), 'tests/fixtures', name)

function json<T>(value: unknown): T {
  return value as T
}

async function createForumApiContext() {
  const context = await request.newContext({ baseURL: BACKEND })
  const response = await context.post(`${API}/auth/login`, {
    data: { username: 'e2ealice', password: PASSWORD },
  })
  if (!response.ok()) {
    await context.dispose()
    throw new Error(`e2ealice 无法登录论坛：${response.status()}`)
  }
  return context
}

async function listBoards(context: APIRequestContext): Promise<Board[]> {
  const response = await context.get(
    `${API}/admin/boards?includeDisabled=true&includeDeleted=true&pageSize=100`,
  )
  const body = json<{ data: { items: Board[] } }>(await response.json())
  return body.data.items
}

async function createThread(
  boardId: number,
  title: string,
  text: string,
): Promise<number> {
  const response = await forumApiContext.post(`${API}/threads`, {
    data: {
      boardId,
      title,
      contentHtml: `<p>${text}</p>`,
    },
  })
  if (!response.ok()) {
    throw new Error(`创建主题失败：${response.status()} ${await response.text()}`)
  }
  const body = json<{ data: { id: number } }>(await response.json())
  return body.data.id
}

async function createReply(thread: number, text: string): Promise<number> {
  const response = await forumApiContext.post(
    `${API}/threads/${thread}/replies`,
    { data: { contentHtml: `<p>${text}</p>` } },
  )
  if (!response.ok()) {
    throw new Error(`创建跟帖失败：${response.status()} ${await response.text()}`)
  }
  const body = json<{ data: { id: number } }>(await response.json())
  return body.data.id
}

async function ensureCarolBoardAdmin(boardId: number) {
  const usersResponse = await adminApiContext.get(
    `${API}/admin/users?keyword=e2ecarol&pageSize=100`,
  )
  const usersBody = json<{
    data: { items: { id: number; username: string }[] }
  }>(await usersResponse.json())
  const carol = usersBody.data.items.find(
    (item) => item.username === 'e2ecarol',
  )
  if (!carol) throw new Error('找不到 e2ecarol')

  const grantsResponse = await adminApiContext.get(
    `${API}/admin/users/${carol.id}/permissions`,
  )
  const grantsBody = json<{
    data: { items: { permissionCode: string; boardId: number | null }[] }
  }>(await grantsResponse.json())

  const grants = new Map(
    grantsBody.data.items.map((grant) => [
      `${grant.permissionCode}:${grant.boardId ?? 0}`,
      grant,
    ]),
  )
  const add = (permissionCode: string, grantBoardId: number | null = null) => {
    grants.set(`${permissionCode}:${grantBoardId ?? 0}`, {
      permissionCode,
      boardId: grantBoardId,
    })
  }

  for (const code of [
    'admin.access',
    'content.view_admin',
    'thread.pin',
    'thread.lock',
    'thread.delete_any',
    'reply.update_any',
    'reply.delete_any',
    'content.restore',
  ]) {
    add(code, boardId)
  }

  const put = await adminApiContext.put(
    `${API}/admin/users/${carol.id}/permissions`,
    { data: { grants: [...grants.values()] } },
  )
  if (!put.ok()) {
    throw new Error(
      `授予 e2ecarol 板块后台权限失败：${put.status()} ${await put.text()}`,
    )
  }
}

async function loginAdmin(page: Page) {
  await page.goto('/admin.html')
  await page.getByLabel('管理员账号').fill('dev')
  await page.getByLabel('密码').fill('dev')
  await page.getByRole('button', { name: '登录管理后台' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: '数据看板' }),
  ).toBeVisible({ timeout: 20_000 })
}

async function loginForum(page: Page, username: string) {
  await page.goto('/')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.getByLabel('账号').fill(username)
  await page.getByLabel('密码').fill(PASSWORD)
  await page.getByRole('button', { name: '登录', exact: true }).last().click()
  await expect(page.locator('header').first()).toContainText(username)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function gotoAdmin(page: Page, route: string) {
  await page.goto(`/admin.html#${route}`)
}

async function expectToast(text: string) {
  const toast = adminPage
    .locator('[data-slot="toast"]:not([aria-hidden="true"])')
    .filter({ hasText: text })
  await expect(toast.last()).toBeVisible()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function checkRow(row: Locator) {
  await row.locator('[data-slot="checkbox-control"]').click()
  await expect(row.getByRole('checkbox')).toBeChecked()
}

/**
 * HeroUI Select 没有原生 <select>，无法使用 selectOption。
 * 触发器是带标签与当前值可访问名的按钮，选项在 portal 中渲染为 option。
 */
async function chooseOption(
  page: Page,
  label: string,
  option: string | RegExp,
  scope: Page | Locator = page,
) {
  await scope
    .getByRole('button', {
      name: new RegExp(`(^|\\s)${escapeRegExp(label)}(\\s|$)`),
    })
    .click()
  await page
    .getByRole('option',
      typeof option === 'string' ? { name: option, exact: true } : { name: option },
    )
    .click()
}

test.beforeAll(async ({ browser }) => {
  // 只登录一次后台：UI 登录后复用浏览器上下文里的 admin cookie 调 API，
  // 避免撞上后台登录限流（默认 5 次/分钟/账号）。
  adminContext = await browser.newContext({ baseURL: FRONTEND })
  adminPage = await adminContext.newPage()
  await loginAdmin(adminPage)
  adminApiContext = await request.newContext({
    baseURL: BACKEND,
    storageState: await adminContext.storageState(),
  })
  forumApiContext = await createForumApiContext()

  const boards = await listBoards(adminApiContext)
  const general = boards.find((board) => board.slug === 'e2e-general')
  const other = boards.find((board) => board.slug === 'e2e-other')
  if (!general || !other) {
    throw new Error('缺少 e2e-general / e2e-other 板块，请先运行 globalSetup。')
  }
  generalBoardId = general.id
  otherBoardId = other.id

  threadId = await createThread(generalBoardId, THREAD_TITLE, THREAD_TEXT)
  secondThreadId = await createThread(
    generalBoardId,
    SECOND_TITLE,
    `${THREAD_TEXT} 批量`,
  )
  await createThread(otherBoardId, OTHER_TITLE, `${THREAD_TEXT} 其他板块`)
  replyThreadId = await createThread(
    generalBoardId,
    REPLY_THREAD_TITLE,
    `${THREAD_TEXT} 跟帖专用`,
  )
  replyId = await createReply(replyThreadId, REPLY_TEXT)

  const uploadResponse = await forumApiContext.post(`${API}/uploads`, {
    multipart: {
      kind: 'post',
      file: {
        name: UPLOAD_NAME,
        mimeType: 'image/png',
        buffer: fs.readFileSync(fixture('post.png')),
      },
    },
  })
  if (!uploadResponse.ok()) {
    throw new Error(
      `上传测试文件失败：${uploadResponse.status()} ${await uploadResponse.text()}`,
    )
  }
  uploadId = json<{ data: { id: number } }>(await uploadResponse.json()).data.id

  await ensureCarolBoardAdmin(generalBoardId)
})

test.afterAll(async () => {
  if (adminApiContext) {
    // 把用于移动测试的主题移回 e2e-general，避免影响板块级管理员用例。
    await adminApiContext
      .patch(`${API}/admin/threads/${secondThreadId}`, {
        data: { boardId: generalBoardId },
        failOnStatusCode: false,
      })
      .catch(() => undefined)
    await adminApiContext.dispose()
  }
  if (forumApiContext) await forumApiContext.dispose()
  if (adminContext) await adminContext.close()
})

test.describe.serial('Moon 管理后台', () => {
  test('未登录要求登录，登录后进入数据看板且使用独立 cookie', async () => {
    const anonymous = await adminContext.browser()?.newContext({
      baseURL: FRONTEND,
    })
    if (!anonymous) throw new Error('无法创建匿名上下文')
    const anonymousPage = await anonymous.newPage()
    await anonymousPage.goto('/admin.html')
    await expect(
      anonymousPage.getByRole('button', { name: '登录管理后台' }),
    ).toBeVisible()
    await expect(
      anonymousPage.getByRole('heading', { level: 1, name: '数据看板' }),
    ).toHaveCount(0)
    await anonymous.close()

    await adminPage.reload()
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '数据看板' }),
    ).toBeVisible()
    await expect(adminPage.getByRole('region', { name: '总量' })).toBeVisible()
    await expect(
      adminPage.getByRole('region', { name: '每日明细' }),
    ).toBeVisible()

    const cookies = await adminContext.cookies()
    expect(
      cookies.some((cookie) => cookie.name === 'forum_admin_session'),
    ).toBe(true)
    expect(cookies.some((cookie) => cookie.name === 'forum_session')).toBe(
      false,
    )
  })

  test('板块管理：创建、编辑、排序、删除与恢复', async () => {
    await gotoAdmin(adminPage, '/boards')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '板块管理' }),
    ).toBeVisible()

    await adminPage.getByRole('button', { name: '新建板块' }).click()
    let dialog = adminPage.getByRole('dialog')
    await dialog.getByLabel('slug').fill(BOARD_SLUG)
    await dialog.getByLabel('名称').fill(BOARD_NAME)
    await dialog.getByLabel('描述').fill(BOARD_DESCRIPTION)
    await dialog.getByLabel('颜色').fill('#22c55e')
    await dialog.getByLabel('排序').fill('50')
    await dialog.getByRole('button', { name: '创建板块' }).click()
    await expectToast('板块已创建')

    let row = adminPage.locator('tbody tr').filter({ hasText: BOARD_NAME })
    await expect(row).toBeVisible()

    await row
      .getByRole('button', { name: `编辑板块 ${BOARD_NAME}` })
      .click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByLabel('名称').fill(`${BOARD_NAME}改`)
    await dialog.getByRole('button', { name: '保存修改' }).click()
    await expectToast('板块已更新')

    row = adminPage.locator('tbody tr').filter({ hasText: `${BOARD_NAME}改` })
    await expect(row).toBeVisible()

    await row
      .getByRole('button', { name: `停用板块 ${BOARD_NAME}改` })
      .click()
    await expectToast('板块状态已更新')
    await expect(row.getByText('已停用')).toBeVisible()

    await adminPage
      .getByRole('button', { name: `上移板块 ${BOARD_NAME}改` })
      .click()
    await expectToast('板块顺序已保存')

    await adminPage
      .getByRole('button', { name: `删除板块 ${BOARD_NAME}改` })
      .click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByRole('button', { name: '删除板块' }).click()
    await expectToast('板块已删除')
    await expect(row.getByText('已删除')).toBeVisible()

    await row
      .getByRole('button', { name: `恢复板块 ${BOARD_NAME}改` })
      .click()
    await expectToast('板块已恢复')
    await expect(row.getByText('启用')).toBeVisible()

    // 清理：删除空板块。
    await row
      .getByRole('button', { name: `删除板块 ${BOARD_NAME}改` })
      .click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByRole('button', { name: '删除板块' }).click()
    await expectToast('板块已删除')
  })

  test('主题管理：筛选、置顶、锁定、移动、批量与恢复', async () => {
    await gotoAdmin(adminPage, '/threads')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '主题管理' }),
    ).toBeVisible()

    await adminPage.getByLabel('关键词', { exact: true }).fill(THREAD_TITLE)
    await adminPage.getByRole('button', { name: '查询' }).click()

    let row = adminPage.locator('tbody tr').filter({ hasText: THREAD_TITLE })
    await expect(row).toBeVisible()
    await expect(row.getByText('正常')).toBeVisible()

    await row
      .getByRole('button', { name: `查看主题 ${threadId}` })
      .click()
    let dialog = adminPage.getByRole('dialog')
    await expect(dialog.getByText(THREAD_TEXT)).toBeVisible()
    await dialog.getByRole('button', { name: '锁定主题' }).click()
    await expect(
      dialog.getByRole('button', { name: '解锁主题' }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: '解锁主题' }).click()
    await expect(
      dialog.getByRole('button', { name: '锁定主题' }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: '关闭主题详情' }).click()
    await expect(dialog).toHaveCount(0)

    await row.getByRole('button', { name: '置顶主题' }).click()
    await expectToast('已置顶')
    await expect(row.getByText('置顶', { exact: true })).toBeVisible()

    // 删除需要填写原因，然后通过“已删除”筛选恢复。
    await row.getByRole('button', { name: '删除主题' }).click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByLabel('操作原因').fill(`后台 E2E 删除 ${RUN}`)
    await dialog.getByRole('button', { name: '删除主题' }).click()
    await expectToast('主题已删除')

    await chooseOption(adminPage, '状态', '已删除')
    await adminPage.getByRole('button', { name: '查询' }).click()
    row = adminPage.locator('tbody tr').filter({ hasText: THREAD_TITLE })
    await expect(row.getByText('已删除')).toBeVisible()
    await row.getByRole('button', { name: '恢复主题' }).click()
    await expectToast('主题已恢复')

    // 恢复后主题离开“已删除”列表，切回正常状态确认。
    await chooseOption(adminPage, '状态', '正常')
    await adminPage.getByRole('button', { name: '查询' }).click()
    row = adminPage.locator('tbody tr').filter({ hasText: THREAD_TITLE })
    await expect(row).toBeVisible()
    // 该主题此前被置顶，恢复后保留置顶状态。
    await expect(row.getByText('置顶', { exact: true })).toBeVisible()

    // 移动第二个主题到其他板块，随后在 afterAll 中移回。
    await adminPage.getByLabel('关键词', { exact: true }).fill(SECOND_TITLE)
    await adminPage.getByRole('button', { name: '查询' }).click()

    const secondRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: SECOND_TITLE })
    await expect(secondRow).toBeVisible()
    await secondRow
      .getByRole('button', { name: `查看主题 ${secondThreadId}` })
      .click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByRole('button', { name: '移动主题' }).click()
    const moveDialog = adminPage.getByRole('dialog').last()
    await chooseOption(adminPage, '目标板块', 'E2E 其他', moveDialog)
    await moveDialog.getByRole('button', { name: '移动', exact: true }).click()
    await expectToast('主题已移动')
    await adminPage
      .getByRole('button', { name: '关闭主题详情' })
      .click()
    await expect(adminPage.getByRole('dialog')).toHaveCount(0)

    // 批量置顶 / 取消置顶。
    await adminPage.getByLabel('关键词', { exact: true }).fill(SECOND_TITLE)
    await adminPage.getByRole('button', { name: '查询' }).click()
    const batchRow = adminPage
      .locator('tbody tr')
      .filter({ hasText: SECOND_TITLE })
    await expect(batchRow).toBeVisible()
    await checkRow(batchRow)
    await chooseOption(adminPage, '批量操作', '置顶')
    await adminPage.getByRole('button', { name: '执行批量操作' }).click()
    await expectToast('批量操作成功 1 条')

    await checkRow(batchRow)
    await chooseOption(adminPage, '批量操作', '取消置顶')
    await adminPage.getByRole('button', { name: '执行批量操作' }).click()
    await expectToast('批量操作成功 1 条')
  })

  test('跟帖管理：编辑正文、删除与恢复', async () => {
    await gotoAdmin(adminPage, '/replies')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '跟帖管理' }),
    ).toBeVisible()

    await adminPage.getByLabel('关键词', { exact: true }).fill(REPLY_TEXT)
    await adminPage.getByRole('button', { name: '查询' }).click()

    let row = adminPage.locator('tbody tr').filter({ hasText: REPLY_TEXT })
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: '编辑跟帖' }).click()

    let dialog = adminPage.getByRole('dialog')
    const editor = dialog.getByLabel('跟帖正文')
    await expect(editor).toBeVisible({ timeout: 20_000 })
    await editor.click()
    await adminPage.keyboard.press('ControlOrMeta+A')
    await adminPage.keyboard.type(`${REPLY_TEXT} 已编辑`)
    await dialog.getByRole('button', { name: '保存跟帖' }).click()
    await expectToast('跟帖已保存')

    row = adminPage
      .locator('tbody tr')
      .filter({ hasText: `${REPLY_TEXT} 已编辑` })
    await expect(row).toBeVisible()

    await row.getByRole('button', { name: '删除跟帖' }).click()
    dialog = adminPage.getByRole('dialog')
    await dialog.getByLabel('操作原因').fill(`后台 E2E 删除跟帖 ${RUN}`)
    await dialog.getByRole('button', { name: '删除跟帖' }).click()
    await expectToast('跟帖已删除')

    await chooseOption(adminPage, '状态', '已删除')
    await adminPage.getByRole('button', { name: '查询' }).click()
    row = adminPage
      .locator('tbody tr')
      .filter({ hasText: `${REPLY_TEXT} 已编辑` })
    await expect(row.getByText('已删除')).toBeVisible()
    await row.getByRole('button', { name: '恢复跟帖' }).click()
    await expectToast('跟帖已恢复')

    // 恢复后跟帖离开“已删除”列表，切回正常状态确认。
    await chooseOption(adminPage, '状态', '正常')
    await adminPage.getByRole('button', { name: '查询' }).click()
    row = adminPage
      .locator('tbody tr')
      .filter({ hasText: `${REPLY_TEXT} 已编辑` })
    await expect(row.getByText('正常')).toBeVisible()

    // 通过专属后台详情接口确认正文确实写回（不依赖游客阅读设置）。
    const detailResponse = await adminApiContext.get(
      `${API}/admin/replies/${replyId}`,
    )
    expect(detailResponse.ok()).toBe(true)
    const detail = json<{
      data: { threadId: number; contentHtml: string }
    }>(await detailResponse.json())
    expect(detail.data.threadId).toBe(replyThreadId)
    expect(detail.data.contentHtml).toContain(`${REPLY_TEXT} 已编辑`)
  })

  test('用户管理：资料、权限、登录记录与封禁', async () => {
    await gotoAdmin(adminPage, '/users')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '用户管理' }),
    ).toBeVisible()

    await adminPage.getByLabel('关键词', { exact: true }).fill('e2ebob')
    await adminPage.getByRole('button', { name: '查询' }).click()

    const row = adminPage
      .locator('tbody tr')
      .filter({ hasText: 'e2ebob' })
    await expect(row).toBeVisible()
    await row
      .getByRole('button', { name: '查看用户 e2ebob' })
      .click()

    const dialog = adminPage.getByRole('dialog')
    await expect(dialog.getByText('用户详情')).toBeVisible()

    const nickname = `E2E Bob ${RUN}`
    await dialog.getByLabel('昵称').fill(nickname)
    await dialog.getByRole('button', { name: '保存资料' }).click()
    await expectToast('用户资料已保存')
    await expect(dialog.getByText(nickname)).toBeVisible()

    // 授予并撤销一个全局权限点。
    await dialog.getByRole('tab', { name: '权限', exact: true }).click()
    await chooseOption(adminPage, '权限点', /stats\.view/, dialog)
    await dialog.getByRole('button', { name: '添加授权' }).click()
    await dialog.getByRole('button', { name: '保存权限' }).click()
    await expectToast('权限已保存')
    await expect(dialog.getByText('stats.view', { exact: true }).first()).toBeVisible()

    await dialog
      .getByRole('button', { name: '移除权限 stats.view' })
      .click()
    await dialog.getByRole('button', { name: '保存权限' }).click()
    await expectToast('权限已保存')

    // 登录记录来自 globalSetup 的登录探测。
    await dialog.getByRole('tab', { name: '登录记录' }).click()
    await expect(dialog.getByText('论坛前台').first()).toBeVisible()

    // 封禁与解封。
    await dialog.getByRole('tab', { name: '资料' }).click()
    await dialog.getByRole('button', { name: '封禁' }).click()
    const banDialog = adminPage.getByRole('dialog').last()
    await banDialog.getByRole('button', { name: '封禁用户' }).click()
    await expectToast('用户已封禁')
    await expect(dialog.getByText('已封禁')).toBeVisible()

    await dialog.getByRole('button', { name: '解封' }).click()
    await expectToast('用户已解封')
    await expect(
      dialog.getByRole('button', { name: '封禁' }),
    ).toBeVisible()

    // 还原昵称。
    await dialog.getByLabel('昵称').fill('')
    await dialog.getByRole('button', { name: '保存资料' }).click()
    await expectToast('用户资料已保存')

    await dialog.getByRole('button', { name: '关闭用户详情' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('站点设置：保存并持久化', async () => {
    await gotoAdmin(adminPage, '/settings')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '站点设置' }),
    ).toBeVisible()

    const announcement = `E2E 公告 ${RUN}`
    await adminPage.getByLabel('公告').fill(announcement)
    await adminPage.getByRole('button', { name: '保存设置' }).click()
    await expectToast('站点设置已保存')

    await adminPage.reload()
    await expect(adminPage.getByLabel('公告')).toHaveValue(announcement)

    // 还原公告，避免影响其他前台用例。
    await adminPage.getByLabel('公告').fill('')
    await adminPage.getByRole('button', { name: '保存设置' }).click()
    await expectToast('站点设置已保存')
  })

  test('文件管理：统计、筛选与删除', async () => {
    await gotoAdmin(adminPage, '/uploads')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '文件管理' }),
    ).toBeVisible()
    await expect(adminPage.getByText('已用空间')).toBeVisible()

    await chooseOption(adminPage, '用途', '主题/跟帖')
    await adminPage.getByRole('button', { name: '查询' }).click()

    const row = adminPage
      .locator('tbody tr')
      .filter({ hasText: UPLOAD_NAME })
    await expect(row).toBeVisible()
    await row
      .getByRole('button', { name: `删除上传 ${uploadId}` })
      .click()
    const dialog = adminPage.getByRole('dialog')
    await dialog.getByRole('button', { name: '删除文件' }).click()
    await expectToast('上传文件已删除')
    await expect(row).toHaveCount(0)
  })

  test('审计日志：按动作筛选', async () => {
    await gotoAdmin(adminPage, '/audit')
    await expect(
      adminPage.getByRole('heading', { level: 1, name: '审计日志' }),
    ).toBeVisible()

    await adminPage.getByLabel('动作').fill('setting.update')
    await adminPage.getByRole('button', { name: '查询' }).click()
    await expect(
      adminPage
        .locator('tbody code')
        .filter({ hasText: 'setting.update' })
        .first(),
    ).toBeVisible()

    await adminPage.getByLabel('目标类型').fill('user')
    await adminPage.getByRole('button', { name: '查询' }).click()
    await expect(
      adminPage.getByText('没有符合条件的审计记录'),
    ).toBeVisible()
  })

  test('板块级管理员只看到授权板块', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: FRONTEND })
    const page = await context.newPage()

    await page.goto('/admin.html')
    await page.getByLabel('管理员账号').fill('e2ecarol')
    await page.getByLabel('密码').fill(PASSWORD)
    await page.getByRole('button', { name: '登录管理后台' }).click()

    await expect(
      page.getByRole('heading', { level: 1, name: '主题管理' }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('板块管理员')).toBeVisible()

    // 没有全局权限的入口。
    await expect(page.getByRole('link', { name: '数据看板' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '用户管理' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '站点设置' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '审计日志' })).toHaveCount(0)

    // 主题列表只包含授权板块。
    await expect(page.getByText(THREAD_TITLE)).toBeVisible()
    await expect(page.getByText(OTHER_TITLE)).toHaveCount(0)

    // 直接访问无权限页面被拒绝。
    await page.goto('/admin.html#/users')
    await expect(page.getByText('无权访问此页面')).toBeVisible()

    // 板块列表也只包含授权板块。
    await page.goto('/admin.html#/boards')
    await expect(page.getByText('E2E 综合')).toBeVisible()
    await expect(page.getByText('E2E 其他')).toHaveCount(0)

    await context.close()
  })

  test('登录态隔离：论坛与后台可同时登录不同账号', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: FRONTEND })
    const page = await context.newPage()

    await loginForum(page, 'e2ealice')

    await page.goto('/admin.html')
    await page.getByLabel('管理员账号').fill('dev')
    await page.getByLabel('密码').fill('dev')
    await page.getByRole('button', { name: '登录管理后台' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: '数据看板' }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('header').getByText('dev', { exact: true })).toBeVisible()

    const cookies = await context.cookies()
    expect(cookies.some((cookie) => cookie.name === 'forum_session')).toBe(
      true,
    )
    expect(
      cookies.some((cookie) => cookie.name === 'forum_admin_session'),
    ).toBe(true)

    // 回到论坛，仍保持 e2ealice 的登录态。
    await page.goto('/')
    await expect(page.locator('header').first()).toContainText('e2ealice')

    // 退出后台不影响论坛前台。
    await page.goto('/admin.html')
    await page.getByRole('button', { name: '退出管理后台' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: '退出管理后台' }).click()
    await expect(page.getByRole('button', { name: '登录管理后台' })).toBeVisible()

    await page.goto('/')
    await expect(page.locator('header').first()).toContainText('e2ealice')

    const afterCookies = await context.cookies()
    expect(
      afterCookies.some((cookie) => cookie.name === 'forum_admin_session'),
    ).toBe(false)
    expect(
      afterCookies.some((cookie) => cookie.name === 'forum_session'),
    ).toBe(true)

    await context.close()
  })
})
