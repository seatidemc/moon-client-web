---
name: moon-ui-verify
description: This skill should be used when reproducing or verifying UI bugs in the moon-client-web checkout (React 19, HeroUI 3, Tailwind 4, Vite) — a forum or admin page renders wrong, the admin login page appears unexpectedly (401 on /admin/auth/me), chevrons or SVGs wrap, table columns or page width shift when a row expands, or the user asks to 验证 UI、复现样式问题、审计日志展开、测量布局、截前后对比图. Not for general React, backend, or deployment questions.
user-invocable: false
---

# Moon UI Verify

Use this procedure to reproduce and verify UI changes in this repo with a scripted browser probe and
before/after measurements instead of screenshot guesswork. It covers the forum (`index.html`) and the
admin app (`admin.html#/...`).

Non-goals: general React debugging, backend design, pixel-diff visual baselines, and full E2E seeding
unless the user asks for them.

Canonical files live in `.claude/skills/moon-ui-verify/`, which Claude Code scans directly as a
project skill.

## Intake checklist

Ask these before touching code. If an answer is missing, state the default and proceed, or ask the
user when the choice changes the verification. Keep the answers in the final report.

1. **Target:** forum or admin, exact route/hash, expected vs actual behavior, reproduction steps.
2. **Servers:** is the backend on `45678` running? Is a dev server already running, on which port?
   May a worktree server be started on `5175`? Never reuse `5174` — it usually serves the main
   checkout.
3. **Auth:** real `dev`/`dev` login, or approval to mock `/forum-v1/admin/auth/me` and the page APIs?
   Default to mocks for a fast loop; finish with real login when the change touches auth.
4. **Data:** which seed rows must exist? May test records be created/deleted, or should payloads be
   synthesized as mocks?
5. **Environment:** viewport (default `1280x900`), theme, browser channel, known proxy/IPv6 quirks,
   and the worktree base branch.
6. **Definition of done:** screenshot only, geometry assertions (default), existing Playwright E2E,
   `tsc`/`oxlint`, or all of them.
7. **Worktree:** base it on the branch under test? Symlink the main checkout's `node_modules`? May the
   ref be corrected if it is wrong? What should be cleaned up afterward?

## Environment gate

Run these checks first and stop on red. Details for each failure live in
[`references/blockers.md`](references/blockers.md).

1. **Correct checkout and ref.** `git rev-parse --show-toplevel`, `git rev-parse --abbrev-ref HEAD`,
   `git log --oneline -3`, and grep for the changed symbol. A worktree based on `origin/main` will not
   contain the feature branch's code; correct the ref before editing.
2. **Dependencies.** `test -f node_modules/playwright/package.json`. In a worktree, run `npm ci` or
   symlink the main checkout's `node_modules`.
3. **Backend.** `lsof -nP -iTCP:45678 -sTCP:LISTEN`. If absent, ask the user or start the sibling
   `go-aliyunmc-v2` repo with `make dev`; the dev admin is `dev`/`dev`.
4. **Frontend.** Start the worktree's own server on a free port, in the background:
   `npm run dev -- --host localhost --port 5175 --strictPort`. Treat it as ready only when the task
   output prints `Local: http://localhost:5175/`. Use `localhost`/`[::1]`, not `127.0.0.1`.
5. **Proxy.** `env | grep -i proxy`. A 502 or empty response for a live server is usually the proxy;
   bypass with `NO_PROXY='*'` for shell checks. The probe launches Chrome with `--no-proxy-server`.
6. **Auth mode.** Decide mock vs real login before writing the probe config.

## Reproduce with the probe

1. Pick the closest config from [`references/probe-config.md`](references/probe-config.md) and write
   it to `test-results/ui-probe/configs/<name>.json` with the Write tool. Do not use heredocs or
   compound commands that leave the worktree.
2. Mock `/forum-v1/admin/auth/me` with the exact `{data: ...}` envelope and `isSuperuser: true`, plus
   every page API the route fires. Shapes are in
   [`references/admin-mocks.md`](references/admin-mocks.md).
3. Fix the viewport and reduced motion so numbers are comparable. Wait for a real page selector
   (`ready`), not `networkidle` — Vite HMR keeps a WebSocket open.
4. Run:

```bash
node .claude/skills/moon-ui-verify/scripts/ui-probe.mjs \
  --config test-results/ui-probe/configs/audit-chevron.json
```

5. Read `result.json` (`mockHits`, `apiErrors`, `consoleErrors`, `pageErrors`, snapshots,
   assertions) and the screenshots in the output directory.

The script exits `0` on pass, `1` on an assertion/console/page failure, and `2` on usage or runtime
errors. It uses the repo's `playwright` package directly and never invokes `tests/e2e/global-setup.ts`.

## Diagnose with measurements

Read [`references/css-gotchas.md`](references/css-gotchas.md) before forming a hypothesis.

- State the measured computed style and rect values. Do not say "probably CSS".
- Compare `initial` and `final` snapshots from the same run.
- Common root causes already confirmed here:
  - Tailwind Preflight makes SVGs `display: block`; an `inline-block` trigger stacks the chevron.
    Fix the trigger with `inline-flex items-center gap-1`, not a global SVG rule.
  - HeroUI tables use auto layout; mounted-but-collapsed disclosure content still contributes
    intrinsic width. `w-full max-w-2xl` caps the content but still grows the column. Use
    `w-0 min-w-full overflow-x-auto` so the content fills the cell without resizing it.
- For a negative control, run the same config against the unfixed main checkout on `5174`. A probe
  that cannot fail proves nothing.

## Fix and re-probe

- Make the smallest component-scoped change; avoid global CSS and broad selector overrides.
- Re-run the identical config and viewport. Do not add manual browser steps between runs.
- Assert outcomes, not adjectives:
  - table width and affected column width change ≤ 1 px between collapsed and expanded;
  - trigger `computed.display === "inline-flex"`;
  - chevron offset from the trigger top ≤ 2 px;
  - trigger height < 24 px (single line).
- Do not assert table height (expected to grow) or SVG `display` (stays `block`).

## Validate and clean up

- `npx tsc -b` (the only type check; there is no `typecheck` script).
- `npx oxlint <changed files>`.
- Run commands directly; `cmd | tail; echo $?` reports the pipe's status. Use `set -o pipefail` if a
  pipe is unavoidable.
- Run the existing E2E only when the backend/MySQL/seed are available:

```bash
E2E_FRONTEND_URL=http://localhost:5175 \
GO_ALIYUNMC_REPO=/Users/su/code/go-aliyunmc-v2 \
npx playwright test tests/e2e/admin.spec.ts
```

- Stop background servers with the task tool, confirm the port is free with `lsof`, remove temporary
  repro pages, and check `git status --short`. `test-results/` is gitignored.
- Final report: branch/commit, before/after numbers, screenshot path, commands with real exit codes,
  and residual risks (mock fidelity, unrun E2E).

## Reference map

| Reference | Read when |
|---|---|
| [`references/project-facts.md`](references/project-facts.md) | Need stack, routes, auth, ports, backend, E2E facts |
| [`references/blockers.md`](references/blockers.md) | Any env/ref/proxy/auth/validation failure |
| [`references/css-gotchas.md`](references/css-gotchas.md) | Layout, table, SVG, flex, measurement rules |
| [`references/admin-mocks.md`](references/admin-mocks.md) | Building auth and page API mocks |
| [`references/probe-config.md`](references/probe-config.md) | Writing or debugging a probe config |

## Red flags

- "Probably CSS" without computed styles or rect numbers.
- Login page when a route was expected: wrong auth path (`/admin/me` instead of `/admin/auth/me`),
  missing `{data}` envelope, `user: null`, or a 401.
- Measuring on `5174` while working in a worktree.
- Treating a `curl` 502 as a dead server without checking the proxy.
- Using `127.0.0.1` against Vite.
- Trusting an exit code taken after a pipe.
- Running `playwright test` for a focused layout loop and dragging in `globalSetup`, MySQL, and seeds.
- Probe passes on both fixed and unfixed code: wrong server, port, or checkout.