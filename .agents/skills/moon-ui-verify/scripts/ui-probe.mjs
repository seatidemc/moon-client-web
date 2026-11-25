#!/usr/bin/env node
/**
 * ui-probe.mjs — scripted Playwright probe for UI layout verification.
 *
 * Reproduces a page with optional API mocks, takes before/after snapshots of
 * element geometry and computed styles, evaluates assertions, and writes a
 * result.json plus screenshots. Uses the repo's `playwright` package directly;
 * it does NOT go through the Playwright test runner, so tests/e2e/global-setup.ts
 * (and its MySQL/backend requirements) is never triggered.
 *
 * Usage:
 *   node .agents/skills/moon-ui-verify/scripts/ui-probe.mjs --config <config.json>
 *        [--out <dir>] [--headed] [--browser chrome|chromium] [--timeout <ms>]
 *        [--no-screenshots] [--json] [--verbose]
 *
 * Exit codes: 0 = pass, 1 = assertion/console/page failure, 2 = usage/runtime.
 */

import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

import { chromium } from 'playwright'

const DEFAULT_VIEWPORT = { width: 1280, height: 900 }
const DEFAULT_PROPS = [
  'display',
  'position',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'tableLayout',
  'whiteSpace',
  'overflowX',
  'alignItems',
  'gap',
  'verticalAlign',
  'lineHeight',
  'fontSize',
]

const USAGE = `Usage: node ui-probe.mjs --config <config.json> [options]

Options:
  --config <path>        Probe config JSON (required)
  --out <dir>            Output directory (default: test-results/ui-probe/<name>-<stamp>)
  --headed               Run a headed browser
  --browser <name>       "chrome" (default) or "chromium"
  --timeout <ms>         Override navigation timeout
  --no-screenshots       Skip full-page and per-probe screenshots
  --json                 Print result.json to stdout
  --verbose              Print mock hits, API errors, and step details
  --help                 Show this help

Exit codes: 0 pass, 1 assertion/console/page failure, 2 usage/runtime error.`

class UsageError extends Error {}

function parseArgs(argv) {
  const args = {
    config: null,
    out: null,
    headed: false,
    browser: null,
    timeout: null,
    screenshots: true,
    json: false,
    verbose: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '--config':
        args.config = argv[++i]
        break
      case '--out':
        args.out = argv[++i]
        break
      case '--headed':
        args.headed = true
        break
      case '--browser':
        args.browser = argv[++i]
        break
      case '--timeout':
        args.timeout = Number(argv[++i])
        break
      case '--no-screenshots':
        args.screenshots = false
        break
      case '--json':
        args.json = true
        break
      case '--verbose':
        args.verbose = true
        break
      case '--help':
      case '-h':
        console.log(USAGE)
        process.exit(0)
        break
      default:
        throw new UsageError(`unknown argument: ${arg}`)
    }
  }

  if (!args.config) throw new UsageError('--config is required')
  if (args.timeout != null && !Number.isFinite(args.timeout)) {
    throw new UsageError('--timeout must be a number of milliseconds')
  }
  if (args.browser && !['chrome', 'chromium'].includes(args.browser)) {
    throw new UsageError('--browser must be "chrome" or "chromium"')
  }

  return args
}

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new UsageError('config must be a JSON object')
  }
  if (typeof config.url !== 'string' || !config.url) {
    throw new UsageError('config.url is required')
  }
  if (!config.ready || typeof config.ready.selector !== 'string') {
    throw new UsageError('config.ready.selector is required')
  }
  if (!Array.isArray(config.probes) || config.probes.length === 0) {
    throw new UsageError('config.probes must be a non-empty array')
  }
  for (const [index, probe] of config.probes.entries()) {
    if (!probe || typeof probe.name !== 'string' || typeof probe.selector !== 'string') {
      throw new UsageError(`config.probes[${index}] needs "name" and "selector"`)
    }
  }
  if (config.steps != null && !Array.isArray(config.steps)) {
    throw new UsageError('config.steps must be an array')
  }
  if (config.assert != null && !Array.isArray(config.assert)) {
    throw new UsageError('config.assert must be an array')
  }
  if (config.mocks != null && !Array.isArray(config.mocks)) {
    throw new UsageError('config.mocks must be an array')
  }
  return config
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function playwrightVersion() {
  try {
    const require = createRequire(import.meta.url)
    return require('playwright/package.json').version
  } catch {
    return 'unknown'
  }
}

function gitMeta() {
  const result = {}
  try {
    result.branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
    result.head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
    result.dirty = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
    }).trim().length > 0
  } catch (error) {
    result.error = String(error.message ?? error)
  }
  return result
}

function attachRecorders(page) {
  const rec = {
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    apiErrors: [],
    mockHits: [],
  }

  page.on('console', (message) => {
    const entry = {
      text: message.text(),
      location: message.location(),
    }
    if (message.type() === 'error') rec.consoleErrors.push(entry)
    if (message.type() === 'warning') rec.consoleWarnings.push(entry)
  })

  page.on('pageerror', (error) => {
    rec.pageErrors.push({ message: error.message, stack: error.stack })
  })

  page.on('requestfailed', (request) => {
    rec.failedRequests.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText ?? 'unknown',
    })
  })

  page.on('response', async (response) => {
    const url = response.url()
    if (!url.includes('/forum-v1/') || response.status() < 400) return
    let body = ''
    try {
      body = (await response.text()).slice(0, 500)
    } catch {
      // Body may be unavailable for aborted requests; status and URL still help.
    }
    rec.apiErrors.push({ status: response.status(), url, body })
  })

  return rec
}

function resetRecorders(rec) {
  rec.consoleErrors.length = 0
  rec.consoleWarnings.length = 0
  rec.pageErrors.length = 0
  rec.failedRequests.length = 0
  rec.apiErrors.length = 0
}

async function installMocks(page, mocks, rec) {
  for (const mock of mocks ?? []) {
    if (!mock.url) throw new UsageError('each mock needs a "url" glob')
    if (mock.json !== undefined && mock.body !== undefined) {
      throw new UsageError(`mock ${mock.name ?? mock.url} has both "json" and "body"`)
    }

    const name = mock.name ?? mock.url
    let uses = 0

    await page.route(mock.url, async (route, request) => {
      if (mock.method && request.method().toUpperCase() !== mock.method.toUpperCase()) {
        return route.fallback()
      }
      if (mock.times != null && uses >= mock.times) return route.fallback()

      uses += 1
      rec.mockHits.push({
        name,
        method: request.method(),
        url: request.url(),
        use: uses,
      })

      if (mock.delayMs) await sleep(mock.delayMs)

      const body =
        mock.body !== undefined
          ? typeof mock.body === 'string'
            ? mock.body
            : JSON.stringify(mock.body)
          : JSON.stringify(mock.json ?? {})

      await route.fulfill({
        status: mock.status ?? 200,
        headers: {
          'content-type': 'application/json',
          ...(mock.headers ?? {}),
        },
        body,
      })
    })
  }
}

async function launchBrowser(preferred, headed) {
  const args = ['--no-proxy-server']
  const channel = preferred ?? 'chrome'

  try {
    const browser = await chromium.launch({ channel, headless: !headed, args })
    return { browser, channel }
  } catch (error) {
    if (preferred) throw error
    console.error(
      `[ui-probe] could not launch channel "chrome": ${error.message}\n` +
        '[ui-probe] falling back to bundled chromium; retry with --browser chromium to silence this.',
    )
    const browser = await chromium.launch({ headless: !headed, args })
    return { browser, channel: 'chromium' }
  }
}

async function measureProbe({ probe, defaultProps }) {
  const nodes = [...document.querySelectorAll(probe.selector)].slice(0, probe.max ?? 5)
  const props = probe.props ?? defaultProps

  const round = (value) => Math.round(value * 100) / 100

  return {
    matched: nodes.length,
    elements: nodes.map((element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const entry = {
        tag: element.tagName.toLowerCase(),
        text: (element.innerText ?? element.textContent ?? '').trim().slice(0, 120),
        rect: {
          x: round(rect.x),
          y: round(rect.y),
          width: round(rect.width),
          height: round(rect.height),
          top: round(rect.top),
          right: round(rect.right),
          bottom: round(rect.bottom),
          left: round(rect.left),
        },
        computed: Object.fromEntries(props.map((property) => [property, style[property]])),
      }

      if (probe.children?.length) {
        entry.children = Object.fromEntries(
          probe.children.map((child) => {
            const node = element.querySelector(child.selector)
            if (!node) return [child.name, null]
            const childRect = node.getBoundingClientRect()
            const childStyle = getComputedStyle(node)
            return [
              child.name,
              {
                rect: {
                  x: round(childRect.x),
                  y: round(childRect.y),
                  width: round(childRect.width),
                  height: round(childRect.height),
                },
                offset: {
                  top: round(childRect.top - rect.top),
                  left: round(childRect.left - rect.left),
                },
                computed: { display: childStyle.display },
              },
            ]
          }),
        )
      }

      return entry
    }),
  }
}

async function takeSnapshot(page, config, label, runDir, screenshots, snapshots, warnings) {
  const probes = {}

  for (const probe of config.probes) {
    probes[probe.name] = await page.evaluate(measureProbe, {
      probe,
      defaultProps: DEFAULT_PROPS,
    })

    if (screenshots && probe.screenshot !== false && probes[probe.name].matched > 0) {
      const path = join(runDir, `${label}-${probe.name}.png`)
      try {
        await page
          .locator(probe.selector)
          .nth(probe.nth ?? 0)
          .screenshot({ path })
      } catch (error) {
        warnings.push(`probe screenshot failed for ${probe.name}: ${error.message}`)
      }
    }
  }

  if (screenshots) {
    const path = join(runDir, `${label}-full.png`)
    try {
      await page.screenshot({ path, fullPage: true })
    } catch (error) {
      warnings.push(`full-page screenshot failed for ${label}: ${error.message}`)
    }
  }

  snapshots[label] = { at: new Date().toISOString(), probes }
  return snapshots[label]
}

async function runStep(page, config, step, index, runDir, screenshots, snapshots, warnings) {
  const label = step.label ?? `step-${index + 1}`
  const timeout = step.timeoutMs ?? 10000

  switch (step.type) {
    case 'click':
      await page.locator(step.selector).nth(step.index ?? 0).click({ timeout })
      break
    case 'fill':
      await page.locator(step.selector).nth(step.index ?? 0).fill(String(step.value ?? ''), {
        timeout,
      })
      break
    case 'press':
      await page
        .locator(step.selector)
        .nth(step.index ?? 0)
        .press(String(step.key ?? step.value ?? 'Enter'), { timeout })
      break
    case 'waitFor':
      await page
        .locator(step.selector)
        .nth(step.index ?? 0)
        .waitFor({ state: step.state ?? 'visible', timeout })
      break
    case 'wait':
      await sleep(step.ms ?? step.value ?? 250)
      break
    case 'goto':
      await page.goto(step.url, {
        waitUntil: 'domcontentloaded',
        timeout: step.timeoutMs ?? config.navigationTimeoutMs ?? 30000,
      })
      break
    case 'snapshot':
      await takeSnapshot(page, config, label, runDir, screenshots, snapshots, warnings)
      return { type: step.type, label }
    case 'screenshot': {
      const path = join(runDir, `${label}-full.png`)
      await page.screenshot({ path, fullPage: step.fullPage !== false })
      return { type: step.type, label, path }
    }
    case 'evaluate': {
      const value = await page.evaluate(step.expression ?? '() => null')
      return { type: step.type, label, value }
    }
    default:
      throw new UsageError(`unknown step type: ${step.type}`)
  }

  if (step.settleMs) await sleep(step.settleMs)
  return { type: step.type, label }
}

function resolveField(snapshot, probeName, field, index = 0) {
  const probe = snapshot?.probes?.[probeName]
  if (!probe) throw new UsageError(`assertion references unknown probe "${probeName}"`)
  if (field === 'count') return probe.matched

  const element = probe.elements[index]
  if (!element) {
    throw new UsageError(
      `assertion field "${field}" needs element ${index} of probe "${probeName}", but only ${probe.elements.length} matched`,
    )
  }
  if (field === 'text') return element.text
  return field.split('.').reduce((value, key) => value?.[key], element)
}

function numeric(value, label) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) {
    throw new UsageError(`assertion "${label}" expected a number, got ${JSON.stringify(value)}`)
  }
  return number
}

function evaluateAssertion(assertion, snapshots) {
  const label = assertion.label ?? `${assertion.type ?? 'assert'} ${assertion.probe ?? ''}`.trim()
  const at = assertion.at ?? 'initial'
  const index = assertion.index ?? 0

  if (assertion.type === 'count') {
    const actual = resolveField(snapshots[at], assertion.probe, 'count')
    const expected = assertion.value ?? 1
    return { label, ok: actual === expected, actual, expected }
  }

  if (assertion.type === 'delta') {
    const fromLabel = assertion.from ?? 'initial'
    const toLabel = assertion.to ?? 'final'
    const from = numeric(
      resolveField(snapshots[fromLabel], assertion.probe, assertion.field, index),
      label,
    )
    const to = numeric(
      resolveField(snapshots[toLabel], assertion.probe, assertion.field, index),
      label,
    )
    const actual = Math.round(Math.abs(to - from) * 100) / 100
    const max = assertion.max ?? assertion.tolerance ?? 1
    return {
      label,
      ok: actual <= max,
      actual,
      expected: `|Δ| <= ${max}`,
      from: { snapshot: fromLabel, value: from },
      to: { snapshot: toLabel, value: to },
    }
  }

  const actual = resolveField(snapshots[at], assertion.probe, assertion.field, index)

  switch (assertion.type) {
    case 'equals':
      return { label, ok: actual === assertion.value, actual, expected: assertion.value }
    case 'notEquals':
      return { label, ok: actual !== assertion.value, actual, expected: `!= ${assertion.value}` }
    case 'lte':
      return {
        label,
        ok: numeric(actual, label) <= assertion.value,
        actual,
        expected: `<= ${assertion.value}`,
      }
    case 'gte':
      return {
        label,
        ok: numeric(actual, label) >= assertion.value,
        actual,
        expected: `>= ${assertion.value}`,
      }
    case 'lt':
      return {
        label,
        ok: numeric(actual, label) < assertion.value,
        actual,
        expected: `< ${assertion.value}`,
      }
    case 'gt':
      return {
        label,
        ok: numeric(actual, label) > assertion.value,
        actual,
        expected: `> ${assertion.value}`,
      }
    case 'within': {
      const number = numeric(actual, label)
      const min = assertion.min ?? Number.NEGATIVE_INFINITY
      const max = assertion.max ?? Number.POSITIVE_INFINITY
      return { label, ok: number >= min && number <= max, actual, expected: `[${min}, ${max}]` }
    }
    default:
      throw new UsageError(`unknown assertion type "${assertion.type}" for "${label}"`)
  }
}

function hasFailure(rec, failOn = {}) {
  const policy = {
    consoleError: true,
    pageError: true,
    requestFailure: false,
    ...failOn,
  }
  const ignore = (policy.ignoreConsole ?? []).map((pattern) => new RegExp(pattern))

  const consoleFailure =
    policy.consoleError &&
    rec.consoleErrors.some((entry) => !ignore.some((pattern) => pattern.test(entry.text)))

  return {
    consoleFailure,
    pageFailure: policy.pageError && rec.pageErrors.length > 0,
    requestFailure: policy.requestFailure && rec.failedRequests.length > 0,
  }
}

function printSummary(result) {
  const status = result.ok ? 'PASS' : 'FAIL'
  console.log(
    `${status} ${result.meta.name}  viewport=${result.meta.viewport.width}x${result.meta.viewport.height}` +
      `  mocks=${result.mockStats.matched}/${result.mockStats.configured}` +
      `  consoleErrors=${result.consoleErrors.length}` +
      `  pageErrors=${result.pageErrors.length}`,
  )

  for (const assertion of result.assertions) {
    const mark = assertion.ok ? 'ok  ' : 'FAIL'
    console.log(`  ${mark} ${assertion.label}: actual=${JSON.stringify(assertion.actual)} expected=${JSON.stringify(assertion.expected)}`)
  }

  for (const snapshot of Object.keys(result.snapshots)) {
    const probes = result.snapshots[snapshot].probes
    const parts = Object.entries(probes).map(([name, probe]) => {
      const element = probe.elements[0]
      const size = element ? `${element.rect.width}x${element.rect.height}` : 'n/a'
      const display = element?.computed?.display ? ` display=${element.computed.display}` : ''
      return `${name}(${size}${display})`
    })
    console.log(`  ${snapshot}: ${parts.join('  ')}`)
  }

  if (result.warnings.length) {
    for (const warning of result.warnings) console.log(`  warning: ${warning}`)
  }
  console.log(`  output: ${result.outputDir}`)
}

async function main() {
  let browser
  try {
    const args = parseArgs(process.argv.slice(2))
    const configPath = resolve(process.cwd(), args.config)
    const config = validateConfig(JSON.parse(await readFile(configPath, 'utf8')))

    const name = config.name ?? 'ui-probe'
    const outputDir = resolve(
      process.cwd(),
      args.out ?? config.outputDir ?? `test-results/ui-probe/${name}-${stamp()}`,
    )
    const screenshots = args.screenshots && config.screenshots?.enabled !== false
    const viewport = { ...DEFAULT_VIEWPORT, ...(config.viewport ?? {}) }
    const warnings = []
    const steps = []

    await mkdir(outputDir, { recursive: true })

    const launched = await launchBrowser(args.browser ?? config.browser, args.headed)
    browser = launched.browser

    const context = await browser.newContext({
      viewport,
      reducedMotion: config.reducedMotion === false ? 'no-preference' : 'reduce',
    })
    const page = await context.newPage()
    const rec = attachRecorders(page)

    await installMocks(page, config.mocks, rec)

    await page.goto(config.url, {
      waitUntil: 'domcontentloaded',
      timeout: args.timeout ?? config.navigationTimeoutMs ?? 30000,
    })

    if (config.auth?.mode === 'login') {
      const username = page.locator('input[autocomplete="username"]').first()
      const password = page.locator('input[autocomplete="current-password"]').first()
      await username.waitFor({ state: 'visible', timeout: 15000 })
      await username.fill(config.auth.username ?? 'dev')
      await password.fill(config.auth.password ?? 'dev')
      await page.locator('button[type="submit"]').first().click({ timeout: 15000 })
    }

    await page
      .locator(config.ready.selector)
      .first()
      .waitFor({ state: config.ready.state ?? 'visible', timeout: config.ready.timeoutMs ?? 15000 })
    await sleep(config.settleMs ?? 250)

    // Login mode intentionally triggers a 401 on /admin/auth/me before the form
    // is submitted. Discard bootstrap noise so it does not fail the run.
    if (config.auth?.mode === 'login') resetRecorders(rec)

    const snapshots = {}
    await takeSnapshot(page, config, 'initial', outputDir, screenshots, snapshots, warnings)

    for (const [index, step] of (config.steps ?? []).entries()) {
      steps.push(await runStep(page, config, step, index, outputDir, screenshots, snapshots, warnings))
    }

    await takeSnapshot(page, config, 'final', outputDir, screenshots, snapshots, warnings)

    const assertions = (config.assert ?? []).map((assertion) =>
      evaluateAssertion(assertion, snapshots),
    )
    const failure = hasFailure(rec, config.failOn)
    const ok =
      assertions.every((assertion) => assertion.ok) &&
      !failure.consoleFailure &&
      !failure.pageFailure &&
      !failure.requestFailure

    const mockDefinitions = [
      ...new Set((config.mocks ?? []).map((mock) => mock.name ?? mock.url)),
    ]
    const matchedMocks = new Set(rec.mockHits.map((hit) => hit.name))
    const mockStats = {
      configured: mockDefinitions.length,
      matched: mockDefinitions.filter((name) => matchedMocks.has(name)).length,
    }

    const result = {
      ok,
      meta: {
        name,
        timestamp: new Date().toISOString(),
        config: configPath,
        url: config.url,
        viewport,
        browser: launched.channel,
        node: process.version,
        playwright: playwrightVersion(),
        git: gitMeta(),
      },
      mockHits: rec.mockHits,
      mockStats,
      apiErrors: rec.apiErrors,
      consoleErrors: rec.consoleErrors,
      consoleWarnings: rec.consoleWarnings,
      pageErrors: rec.pageErrors,
      failedRequests: rec.failedRequests,
      steps,
      snapshots,
      assertions,
      warnings,
      outputDir,
    }

    await writeFile(join(outputDir, 'result.json'), JSON.stringify(result, null, 2))

    if (args.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      printSummary(result)
      if (args.verbose) {
        if (rec.apiErrors.length) console.log('  apiErrors:', JSON.stringify(rec.apiErrors, null, 2))
        if (rec.mockHits.length) console.log('  mockHits:', JSON.stringify(rec.mockHits, null, 2))
        if (steps.length) console.log('  steps:', JSON.stringify(steps, null, 2))
      }
    }

    process.exitCode = ok ? 0 : 1
  } catch (error) {
    console.error(`[ui-probe] ${error.stack ?? error}`)
    process.exitCode = 2
  } finally {
    await browser?.close().catch(() => {})
  }
}

main()