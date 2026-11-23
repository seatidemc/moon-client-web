import fs from 'node:fs'
import path from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'

const state = () =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/.state.json'),
      'utf8',
    ),
  ) as {
    aliceId: number
    bobId: number
    carolId: number
    generalBoardId: number
    otherBoardId: number
  }

const fixture = (name: string) =>
  path.resolve(process.cwd(), 'tests/fixtures', name)

const GENERAL_BOARD = 'e2e-general'
const OTHER_BOARD = 'e2e-other'
const PASSWORD = 'e2epass'

const RUN = Date.now().toString(36)
const TAG = `e2e${RUN}`
const TITLE = `E2E 主题 ${RUN}`
const OTHER_TITLE = `E2E 其他板块 ${RUN}`
const BOB_TEXT = `Bob 的跟帖 ${RUN}`
const ALICE_TEXT = `Alice 的引用与提及 ${RUN}`
const BIO_TEXT = `Alice 的 E2E 简介 ${RUN}`

let threadUrl = ''
let threadId = 0
let otherThreadUrl = ''
let bobReplyId = 0
let aliceReplyId = 0

async function login(page: Page, username: string) {
  await page.goto('/')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await page.getByLabel('账号').fill(username)
  await page.getByLabel('密码').fill(PASSWORD)
  await page.getByRole('button', { name: '登录', exact: true }).last().click()

  await expect(page.locator('header').first()).toContainText(username)
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function newSession(browser: Browser, username: string) {
  const context = await browser.newContext({
    baseURL: process.env.E2E_FRONTEND_URL ?? 'http://localhost:5174',
  })
  const page = await context.newPage()
  await login(page, username)
  return { context, page }
}

test.describe.serial('Moon 论坛主流程', () => {
  test('登录后发布带图片的主题', async ({ browser }) => {
    const { context, page } = await newSession(browser, 'e2ealice')

    await page.goto(`/topic/${GENERAL_BOARD}`)
    await expect(
      page.getByRole('heading', { name: 'E2E 综合' }),
    ).toBeVisible()

    await page
      .getByRole('button', { name: '发布帖子', exact: true })
      .first()
      .click()
    await page.getByRole('button', { name: '高级编辑' }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('用一句话说清楚主题').fill(TITLE)

    const editor = dialog.getByLabel('正文')
    await editor.click()
    await page.keyboard.type(`端到端正文 #${TAG}`)

    await dialog.getByRole('button', { name: '插入图片' }).click()
    await dialog
      .locator('input[type="file"][accept="image/*"]')
      .setInputFiles(fixture('post.png'))
    await expect(
      dialog.locator('.moon-editor-content img[src*="/forum-v1/files/"]'),
    ).toBeVisible({ timeout: 20_000 })

    await dialog
      .getByRole('button', { name: '发布帖子', exact: true })
      .click()

    await expect(page).toHaveURL(/\/thread\/\d+$/, { timeout: 20_000 })
    threadUrl = page.url()
    threadId = Number(threadUrl.split('/').pop())

    await expect(
      page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()
    const postImage = page
      .locator('article#thread-post .moon-rich-text img[src*="/forum-v1/files/"]')
      .first()
    await expect(postImage).toBeVisible()

    // 点击正文图片打开同楼层预览。PhotoSwipe 在开场动画期间会忽略
    // 关闭操作，所以等动画结束再按 Esc。
    await postImage.click()
    await expect(page.locator('.pswp')).toBeVisible()
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await expect(page.locator('.pswp')).toHaveCount(0, { timeout: 10_000 })

    // 另一个板块的主题，用于验证非授权板块不显示管理操作。
    await page.goto(`/topic/${OTHER_BOARD}`)
    await page
      .getByRole('button', { name: '发布帖子', exact: true })
      .first()
      .click()

    const otherDialog = page.getByRole('dialog')
    await otherDialog
      .getByPlaceholder('用一句话说清楚主题')
      .fill(OTHER_TITLE)
    const otherEditor = otherDialog.getByLabel('正文')
    await otherEditor.click()
    await page.keyboard.type('其他板块的正文')
    await otherDialog
      .getByRole('button', { name: '发布帖子', exact: true })
      .click()

    await expect(page).toHaveURL(/\/thread\/\d+$/, { timeout: 20_000 })
    otherThreadUrl = page.url()
    await expect(
      page.getByRole('heading', { level: 1, name: OTHER_TITLE }),
    ).toBeVisible()

    await context.close()
  })

  test('跟帖、楼层引用、@ 提及与主题点赞', async ({ browser }) => {
    const bob = await newSession(browser, 'e2ebob')
    await bob.page.goto(threadUrl)
    await expect(
      bob.page.getByRole('heading', { level: 1, name: TITLE }),
    ).toBeVisible()

    const bobEditor = bob.page.getByLabel('跟帖内容')
    await bobEditor.click()
    await bob.page.keyboard.type(BOB_TEXT)
    await bob.page.getByRole('button', { name: '发布', exact: true }).click()

    const bobArticle = bob.page
      .locator('article[id^="reply-"]')
      .filter({ hasText: BOB_TEXT })
      .first()
    await expect(bobArticle).toBeVisible()
    bobReplyId = Number(
      ((await bobArticle.getAttribute('id')) ?? '').replace('reply-', ''),
    )
    expect(bobReplyId).toBeGreaterThan(0)

    await bob.page
      .getByRole('button', { name: '点赞主题' })
      .first()
      .click()
    await expect(
      bob.page
        .getByRole('button', { name: '取消主题的点赞' })
        .first(),
    ).toBeVisible()

    await bob.context.close()

    const alice = await newSession(browser, 'e2ealice')
    await alice.page.goto(threadUrl)
    await expect(
      alice.page.getByText(BOB_TEXT, { exact: false }),
    ).toBeVisible()

    await alice.page
      .getByRole('button', { name: '回复第 1 楼' })
      .click()

    const composer = alice.page.getByLabel('跟帖内容')
    await composer.click()
    await alice.page.keyboard.type(`${ALICE_TEXT} `)
    await alice.page.keyboard.type('@e2ebob')

    await expect(
      alice.page.getByRole('listbox', { name: '选择要提及的用户' }),
    ).toBeVisible()
    await expect(
      alice.page.getByRole('option', { name: /e2ebob/ }),
    ).toBeVisible()
    await alice.page.keyboard.press('Enter')

    const composerHtml = await composer.evaluate((element) => element.innerHTML)
    expect(composerHtml).toContain('data-tag-type="reply"')
    expect(composerHtml).toContain('data-tag-type="mention"')

    await alice.page.getByRole('button', { name: '发布', exact: true }).click()

    const aliceArticle = alice.page
      .locator('article[id^="reply-"]')
      .filter({ hasText: ALICE_TEXT })
      .first()
    await expect(aliceArticle).toBeVisible()
    aliceReplyId = Number(
      ((await aliceArticle.getAttribute('id')) ?? '').replace('reply-', ''),
    )
    expect(aliceReplyId).toBeGreaterThan(0)

    await expect(
      alice.page.locator(
        `article#reply-${aliceReplyId} a[href="/thread/${threadId}#reply-${bobReplyId}"]`,
      ),
    ).toBeVisible()

    await alice.context.close()
  })

  test('通知：回复、点赞、提及与已读', async ({ browser }) => {
    const bob = await newSession(browser, 'e2ebob')
    await bob.page.goto('/notifications')

    const mention = bob.page.locator(
      `section[aria-label="通知列表"] a[href="/thread/${threadId}#reply-${aliceReplyId}"]`,
    )
    await expect(mention).toContainText('提到了你')
    await expect(mention).toHaveClass(/bg-accent-soft/)

    await mention.click()
    await expect(bob.page).toHaveURL(
      new RegExp(`#reply-${aliceReplyId}$`),
    )
    await expect(
      bob.page.locator(`article#reply-${aliceReplyId}`),
    ).toBeVisible()

    await bob.page.goto('/notifications')
    const readMention = bob.page.locator(
      `section[aria-label="通知列表"] a[href="/thread/${threadId}#reply-${aliceReplyId}"]`,
    )
    await expect(readMention).not.toHaveClass(/bg-accent-soft/)
    await bob.context.close()

    const alice = await newSession(browser, 'e2ealice')
    await alice.page.goto('/notifications')

    const replyNotice = alice.page.locator(
      `section[aria-label="通知列表"] a[href="/thread/${threadId}#reply-${bobReplyId}"]`,
    )
    await expect(replyNotice).toContainText('回复了你的主题')

    const likeNotice = alice.page.locator(
      `section[aria-label="通知列表"] a[href="/thread/${threadId}"]`,
    )
    await expect(likeNotice).toContainText('赞了你的主题')
    await expect(replyNotice).toHaveClass(/bg-accent-soft/)
    await expect(likeNotice).toHaveClass(/bg-accent-soft/)

    const markAll = alice.page.getByRole('button', { name: '全部标为已读' })
    await expect(markAll).toBeVisible()
    await markAll.click()
    await expect(replyNotice).not.toHaveClass(/bg-accent-soft/)
    await expect(likeNotice).not.toHaveClass(/bg-accent-soft/)

    await alice.context.close()
  })

  test('个人主页：简介、头像、形状与背景', async ({ browser }) => {
    const { context, page } = await newSession(browser, 'e2ealice')
    await page.goto(`/user/${state().aliceId}`)

    const addBio = page.getByRole('button', { name: '添加个人介绍' })
    if ((await addBio.count()) > 0) {
      await addBio.click()
    } else {
      await page.getByRole('button', { name: '编辑个人介绍' }).click()
    }
    await page.getByLabel('个人介绍').fill(BIO_TEXT)
    await page.getByRole('button', { name: '保存', exact: true }).click()
    await expect(page.getByText(BIO_TEXT)).toBeVisible()

    await page.getByRole('button', { name: '更换头像' }).click({ force: true })
    let dialog = page.getByRole('dialog')
    await dialog.locator('input[type="file"]').setInputFiles(fixture('avatar.png'))
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.locator('main img.avatar__image').first(),
    ).toHaveAttribute('src', /\/forum-v1\/files\//)

    const profileAvatar = page.locator('main .avatar--lg').first()
    const avatarClass = await profileAvatar.getAttribute('class')
    const isSquare = (avatarClass ?? '').includes('rounded-[10%]')
    const targetTab = isSquare ? '圆形头像' : '方形头像'
    const expectedClass = isSquare ? 'rounded-full' : 'rounded-[10%]'

    await page.getByRole('button', { name: '更换头像' }).click({ force: true })
    dialog = page.getByRole('dialog')
    await dialog.getByRole('tab', { name: targetTab }).click()
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(profileAvatar).toHaveClass(
      new RegExp(expectedClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    )

    await page.getByRole('button', { name: '个性化' }).click()
    dialog = page.getByRole('dialog')
    await dialog
      .locator('input[type="file"]')
      .setInputFiles(fixture('background.png'))
    await expect(
      dialog.locator('img[alt="主页背景预览"]'),
    ).toBeVisible({ timeout: 20_000 })
    await dialog.getByRole('button', { name: '完成' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(
      page.locator('main > div[style*="background-image"]').first(),
    ).toBeVisible()

    await context.close()
  })

  test('搜索：关键词、标签、作者与无结果', async ({ browser }) => {
    const { context, page } = await newSession(browser, 'e2ealice')

    await page.goto(`/search?q=${encodeURIComponent(TITLE)}`)
    await expect(
      page.getByRole('heading', { name: TITLE }),
    ).toBeVisible()

    await page.goto(`/search?q=${encodeURIComponent(`#${TAG}`)}`)
    await expect(
      page.getByRole('heading', { name: TITLE }),
    ).toBeVisible()

    await page.goto(`/search?q=${encodeURIComponent('e2ealice')}`)
    await expect(
      page.getByRole('heading', { name: TITLE }),
    ).toBeVisible()

    await page.goto(`/search?q=${encodeURIComponent(`no-such-${RUN}`)}`)
    await expect(page.getByText('找到 0 个结果')).toBeVisible()
    await expect(page.getByText('没有找到相关主题。')).toBeVisible()

    await context.close()
  })

  test('板块版主：置顶、跨板块不可见、删除后楼层占位与引用', async ({
    browser,
  }) => {
    const { context, page } = await newSession(browser, 'e2ecarol')

    await page.goto(threadUrl)
    await expect(page.getByRole('button', { name: '置顶主题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '锁定主题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '编辑主题' })).toBeVisible()
    await expect(page.getByRole('button', { name: '删除主题' })).toBeVisible()

    await page.getByRole('button', { name: '置顶主题' }).click()
    await expect(page.getByRole('button', { name: '取消置顶' })).toBeVisible()

    await page.goto(otherThreadUrl)
    await expect(
      page.getByRole('button', { name: '置顶主题' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '锁定主题' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '编辑主题' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '删除主题' }),
    ).toHaveCount(0)

    await page.goto(threadUrl)
    const bobArticle = page.locator(`#reply-${bobReplyId}`)
    await expect(bobArticle).toBeVisible()
    await bobArticle.getByRole('button', { name: '删除跟帖' }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('删除这条跟帖？')
    await dialog.getByRole('button', { name: '删除', exact: true }).click()

    await expect(bobArticle).toContainText('该楼层已删除')
    await expect(bobArticle).toContainText('#1')

    const reference = page.locator(
      `#reply-${aliceReplyId} a[href="/thread/${threadId}#reply-${bobReplyId}"]`,
    )
    await expect(reference).toBeVisible()
    await reference.click()
    await expect(bobArticle).toBeVisible()

    await context.close()
  })
})