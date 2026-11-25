# Probe config reference

`scripts/ui-probe.mjs` is config-driven. Write configs with the Write tool (no heredocs), keep them
under `test-results/ui-probe/configs/<name>.json` (gitignored), and run from the repo/worktree root:

```bash
node .agents/skills/moon-ui-verify/scripts/ui-probe.mjs \
  --config test-results/ui-probe/configs/audit-chevron.json
```

Options: `--out <dir>`, `--headed`, `--browser chrome|chromium`, `--timeout <ms>`,
`--no-screenshots`, `--json`, `--verbose`.

Exit codes: `0` pass, `1` assertion or console/page failure, `2` usage/config/runtime error.
Output: `test-results/ui-probe/<name>-<stamp>/result.json` plus screenshots.

## Complete example: audit disclosure

```json
{
  "name": "audit-chevron",
  "url": "http://localhost:5175/admin.html#/audit",
  "viewport": { "width": 1280, "height": 900 },
  "reducedMotion": true,
  "settleMs": 250,
  "ready": { "selector": "h1:has-text(\"审计日志\")" },
  "mocks": [
    {
      "name": "admin-me",
      "url": "**/forum-v1/admin/auth/me",
      "method": "GET",
      "json": {
        "data": {
          "user": {
            "id": 1,
            "username": "dev",
            "nickname": null,
            "avatarUrl": "",
            "avatarShape": "circle"
          },
          "isSuperuser": true,
          "globalPermissions": [],
          "boardPermissions": {}
        }
      }
    },
    {
      "name": "audit-logs",
      "url": "**/forum-v1/admin/audit-logs*",
      "method": "GET",
      "json": {
        "data": {
          "items": [
            {
              "id": 1,
              "actorId": 1,
              "action": "thread.update",
              "targetType": "thread",
              "targetId": 42,
              "detail": {
                "before": { "title": "旧标题", "content": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
                "after": { "title": "新标题", "content": "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" },
                "reason": "spam"
              },
              "ip": "203.0.113.7",
              "userAgent": "moon-ui-verify probe",
              "createdAt": "2026-11-25T04:00:00Z"
            }
          ],
          "total": 1,
          "page": 1,
          "pageSize": 20
        }
      }
    }
  ],
  "probes": [
    { "name": "table", "selector": "table" },
    {
      "name": "detailColumn",
      "selector": "table thead th:nth-child(5)",
      "props": ["width"]
    },
    {
      "name": "trigger",
      "selector": "[data-slot=disclosure-trigger]",
      "children": [
        { "name": "chevron", "selector": "[data-slot=disclosure-indicator]" }
      ]
    }
  ],
  "steps": [
    { "type": "click", "selector": "[data-slot=disclosure-trigger]" },
    {
      "type": "waitFor",
      "selector": "[data-slot=disclosure-content][data-expanded=true]"
    }
  ],
  "assert": [
    {
      "type": "delta",
      "label": "table width stable",
      "probe": "table",
      "field": "rect.width",
      "from": "initial",
      "to": "final",
      "max": 1
    },
    {
      "type": "delta",
      "label": "detail column stable",
      "probe": "detailColumn",
      "field": "rect.width",
      "from": "initial",
      "to": "final",
      "max": 1
    },
    {
      "type": "equals",
      "label": "trigger is inline-flex",
      "probe": "trigger",
      "field": "computed.display",
      "at": "initial",
      "value": "inline-flex"
    },
    {
      "type": "lte",
      "label": "chevron stays on the line",
      "probe": "trigger",
      "field": "children.chevron.offset.top",
      "at": "initial",
      "value": 2
    },
    {
      "type": "lt",
      "label": "trigger height is single-line",
      "probe": "trigger",
      "field": "rect.height",
      "at": "initial",
      "value": 24
    }
  ]
}
```

Snapshots `initial` and `final` are taken automatically. Any `snapshot` step adds another label.
With `reducedMotion: true`, expansion settles without waiting on HeroUI's height transition.

## Top-level fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `name` | string | config filename | Run label; also names the output folder |
| `url` | string | required | Absolute URL including hash route |
| `viewport` | `{width,height}` | `1280x900` | Fixed viewport for comparable measurements |
| `reducedMotion` | boolean | `true` | Sets `prefers-reduced-motion: reduce` |
| `settleMs` | number | `250` | Wait after navigation and after each step |
| `navigationTimeoutMs` | number | `30000` | `page.goto` timeout |
| `ready` | `{selector, state?, timeoutMs?}` | required | Wait for real content, not `networkidle` |
| `auth` | `{mode: "none"\|"login", username?, password?}` | `none` | `login` fills the admin form, then clears bootstrap console/network noise (the expected 401 on `/admin/auth/me`) |
| `browser` | `"chrome"\|"chromium"` | `"chrome"` | Channel; falls back to chromium with a warning |
| `mocks` | array | `[]` | `page.route` fulfillments, installed before navigation |
| `probes` | array | required | Selectors measured in every snapshot |
| `steps` | array | `[]` | Actions run between the automatic snapshots |
| `assert` | array | `[]` | Assertions evaluated over snapshots |
| `screenshots` | `{enabled?: boolean}` | enabled | Global switch; per-probe `screenshot: false` also works |
| `failOn` | `{consoleError?, pageError?, requestFailure?, ignoreConsole?}` | console/page errors fail; request failures do not | Failure policy; `ignoreConsole` is an array of regex strings |
| `outputDir` | string | generated | Override output directory |

## Mock fields

| Field | Meaning |
|---|---|
| `name` | Label in `mockHits` and the summary |
| `url` | Playwright glob, e.g. `**/forum-v1/admin/audit-logs*` |
| `method` | Optional method guard; mismatch calls `route.fallback()` |
| `status` | Default 200 |
| `headers` | Extra response headers |
| `json` / `body` | Exactly one; objects are stringified |
| `delayMs` | Optional delay before fulfilling |
| `times` | Optional match limit; extra matches fall back to the network |

## Probe fields

| Field | Meaning |
|---|---|
| `name` | Key used by assertions |
| `selector` | Playwright selector string |
| `nth` | Element index for screenshots, default 0 |
| `max` | Max elements recorded, default 5 |
| `props` | Computed-style properties; sensible defaults if omitted |
| `children` | `[{ name, selector }]` measured relative to each matched element |
| `screenshot` | Set `false` to skip the per-probe screenshot |

Each recorded element contains `tag`, `text`, `rect`, `computed`, and optional `children` with
`rect`, `offset`, and child `display`.

## Step fields

| `type` | Fields |
|---|---|
| `click` | `selector`, `index?`, `timeoutMs?` |
| `fill` | `selector`, `value`, `index?` |
| `press` | `selector`, `key` (default `Enter`), `index?` |
| `waitFor` | `selector`, `state?` (default `visible`), `timeoutMs?` |
| `wait` | `ms` |
| `goto` | `url`, `timeoutMs?` |
| `snapshot` | `label` |
| `screenshot` | `label`, `fullPage?` |
| `evaluate` | `expression` (string evaluated in the page) |

All steps accept `settleMs` and optional `label`.

## Assertion fields

| `type` | Fields | Pass condition |
|---|---|---|
| `delta` | `probe`, `field`, `from?`, `to?`, `max?` | `abs(value(to) - value(from)) <= max` (default 1) |
| `equals` | `probe`, `field`, `at?`, `value` | strict equality |
| `notEquals` | same | strict inequality |
| `lte` / `lt` / `gte` / `gt` | `probe`, `field`, `at?`, `value` | numeric comparison |
| `within` | `probe`, `field`, `at?`, `min`, `max` | inclusive range |
| `count` | `probe`, `at?`, `value` | matched element count |

Field paths: `count`, `text`, `rect.width`, `rect.height`, `rect.x`, `rect.y`,
`computed.<property>`, `children.<name>.offset.top`, `children.<name>.rect.width`.
`index` selects which matched element to read (default 0).

## Selector recipes

| Target | Selector |
|---|---|
| Admin username | `input[autocomplete="username"]` |
| Admin password | `input[autocomplete="current-password"]` |
| Admin submit | `button[type="submit"]` |
| Audit page ready | `h1:has-text("审计日志")` |
| Disclosure trigger | `[data-slot="disclosure-trigger"]` |
| Expanded content | `[data-slot="disclosure-content"][data-expanded="true"]` |
| Chevron | `[data-slot="disclosure-indicator"]` |
| Detail column header | `table thead th:nth-child(5)` |
| Detail cell | `table tbody tr:nth-child(1) td:nth-child(5)` |
| Table | `table` |

The repo has no `data-testid`; prefer accessible roles/labels where possible and HeroUI `data-slot`
attributes for internals.

## Golden trace (diagnostic, not portable)

Measured during the audit fix:

- Standalone reproduction at `1280x900`, unfixed: trigger `24x32`, chevron offset `16`, table
  `1208 -> 1282.38`, detail column `437 -> 720`.
- Same reproduction, fixed with `inline-flex items-center gap-1` and `w-0 min-w-full`: trigger
  `44x16`, chevron offset `0`, table and detail column unchanged.
- Real admin page at `1440x900`, fixed: table `1176`, columns `174/75/155/102/423/247`, trigger
  `44x16`, widths identical collapsed and expanded.

Absolute values depend on viewport, fonts, and Chrome version. The config above asserts deltas and
bounds, so it stays portable. On the unfixed page expect: trigger `display: inline-block`, height
`> 24`, chevron offset `> 2`, and positive table/column deltas. On the fixed page expect all
assertions to pass.

## Troubleshooting

| Problem | Check |
|---|---|
| `Cannot find package 'playwright'` | `node_modules` missing; see `blockers.md` #2 |
| Chrome fails to launch | Retry with `--browser chromium` |
| Timeout waiting for `ready` | Wrong port/hash, auth mock missing, or login page shown |
| Mock not hit | `result.json` → `mockHits`; pattern must match the full URL including `/forum-v1`; check registration order |
| Login page instead of the route | `blockers.md` #6; path is `/admin/auth/me` |
| `502` from the page | Proxy bypass; probe uses `--no-proxy-server`; use `localhost` not `127.0.0.1` |
| Assertions pass against unreachable code | Wrong server checkout/port; `result.json` → `meta.git` and `meta.url` |
| Exit code `2` | Read the printed config/usage error |
| Need request/response details | `--verbose` or open `result.json` `apiErrors` / `failedRequests` |