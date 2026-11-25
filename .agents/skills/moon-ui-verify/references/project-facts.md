# Project facts — moon-client-web

Verified 2026-11-25 against `feature/enhance-admin-11-24` at `e5723b2` (worktree `fix-audit-view-chevron`).
Code wins over this file. When a fact disagrees with the code, re-run the drift checks at the bottom
and update this file.

## Stack

- React `^19.3.1`, `@heroui/react` / `@heroui/styles` `3.2.7`, Tailwind CSS `^4.3.5`
- Vite `^8.3.6`, TypeScript `~7.0.2`, Node `>=20.19`
- TanStack Query `^5.108.0`, react-router-dom `^7.18.5`
- Playwright `^1.65.1`; lint is `oxlint`

## Entry points and routes

- Forum: `index.html` → `src/main.tsx`
- Admin: `admin.html` → `src/admin/main.tsx`, `HashRouter`
  - Routes: `/dashboard`, `/threads`, `/replies`, `/boards`, `/users`, `/uploads`, `/settings`, `/audit`
  - Deep links look like `http://localhost:5175/admin.html#/audit`
  - Index and `*` redirect to the first permitted nav item (`/dashboard` for a superuser)

Nav and route permissions (`src/admin/AdminApp.tsx`):

| Route | Permission |
|---|---|
| dashboard | `stats.view` (global) |
| threads / replies | `content.view_admin` (global or any board) |
| boards | always visible |
| users | `user.list` (global) |
| uploads | `upload.manage` (global) |
| settings | `settings.manage` (global) |
| audit | `audit.view` (global) |

## Admin auth

Endpoints (`src/admin/api.ts`, prefix `/forum-v1/admin`):

| Method | Path | Body / result |
|---|---|---|
| GET | `/forum-v1/admin/auth/me` | `AdminMe` |
| POST | `/forum-v1/admin/auth/login` | `{ username, password, remember: true }` → `AdminLoginResult` |
| POST | `/forum-v1/admin/auth/logout` | `void` |

- Session cookie: `forum_admin_session`, independent from the forum's `forum_session`.
- `AdminMe` (`src/admin/types.ts`):

```ts
{
  user: UserSummary | null
  isSuperuser: boolean
  globalPermissions: string[]
  boardPermissions: Record<string, string[]>
}
```

- `AdminProvider` (`src/admin/store.tsx`) maps `me` query results to pages:
  - 401 → `anonymous` → `LoginPage`
  - 403 → `forbidden` → `AccessDeniedPage` ("无管理权限")
  - other error → `error` → `ServiceErrorPage` ("无法读取管理状态")
  - `!me.user` → `anonymous`
  - `isSuperuser: true` bypasses permission checks.
- Login UI selectors (`src/admin/components/LoginPage.tsx`):
  - username `input[autocomplete="username"]`
  - password `input[autocomplete="current-password"]`
  - submit `button[type="submit"]`
  - labels `管理员账号` / `密码`, button `登录管理后台`

## API contract

- `src/lib/api.ts` fetches `API_BASE + path` with `credentials: 'include'`.
- Success envelope `{ "data": ... }` — `request()` unwraps `data`.
- Error envelope `{ "details": "..." }` → `ApiError(status, details)`.
- 401 globally invalidates the `me` query; 403/429 shows a toast.
- `API_BASE = import.meta.env.VITE_API_BASE || '/forum-v1'`.

## Vite dev proxy

`vite.config.ts`:

- `/forum-v1` → `http://localhost:45678`, `changeOrigin: true`
- The proxy forces `Origin: http://localhost:5174` on proxied requests so backend dev CORS accepts
  them even when the frontend runs on another port (e.g. a worktree on 5175). Do not "fix" this.

## Backend and E2E accounts

- Backend repo: sibling `/Users/su/code/go-aliyunmc-v2`; start with `make dev`
  (`GO_ALIYUNMC_DEV=1`, state dir `.dev`).
- Dev admin: `dev` / `dev`, auto-created when the backend runs with the dev flag.
- E2E forum users: `e2ealice`, `e2ebob`, `e2ecarol`; password `e2epass`.
- E2E seeds in `tests/e2e/global-setup.ts`:
  - boards `e2e-general`, `e2e-other`
  - `e2ecarol` gets board-scoped moderator/admin permissions
  - writes `tests/e2e/.state.json` (gitignored)
- `GO_ALIYUNMC_REPO` defaults to `path.resolve(cwd, '../go-aliyunmc-v2')`; inside a worktree that
  points at the wrong place. Set it to `/Users/su/code/go-aliyunmc-v2` when running E2E from a worktree.

## Playwright E2E

`playwright.config.ts`:

- `testDir: ./tests/e2e`, `fullyParallel: false`, `workers: 1`, timeout 90 s
- `baseURL: process.env.E2E_FRONTEND_URL ?? 'http://localhost:5174'`
- `channel: 'chrome'`, `launchOptions.args: ['--no-proxy-server']`, viewport `1280x900`
- `globalSetup: ./tests/e2e/global-setup.ts` — requires a live backend, MySQL, and a frontend
- Tests are serial and use role/label selectors; there is no `page.route` mocking, no `data-testid`,
  and no visual-regression baseline anywhere in the repo.
- Specs: `tests/e2e/admin.spec.ts`, `tests/e2e/forum.spec.ts`.
- Run only admin: `npx playwright test tests/e2e/admin.spec.ts` (global setup still runs).
- The audit spec only filters logs; it does not click `查看`, so disclosure layout needs a probe.

## Validation commands

- Type check: `npx tsc -b` (no `typecheck` script)
- Lint: `npx oxlint <changed files>` or `npm run lint`
- Build: `npm run build` = `tsc -b && vite build`
- Do not use `cmd | tail; echo $?` to judge success; the exit code belongs to the pipe. Run the
  command directly or use `set -o pipefail`.

## Ports and environment quirks

- A dev server already running on `5174` usually belongs to the **main checkout**, not the worktree.
  Never reuse it to verify worktree changes; start the worktree's own server on `5175`.
- Vite binds IPv6 `::1`; `http://127.0.0.1:<port>` may be refused. Use `localhost` or `[::1]`.
- `http_proxy` / `https_proxy` / `all_proxy` may point at `127.0.0.1:7890`. Localhost requests through
  the proxy can return 502 even when the server is healthy. Bypass with `NO_PROXY='*'` for shell
  checks; the probe launches Chrome with `--no-proxy-server`.
- Benign console noise: Vite HMR `debug` messages, React DevTools `info`, and the HeroUI warning
  "A PressResponder was rendered without a pressable child." Only console `error` should fail a probe.

## Worktree facts

- Main checkout: `/Users/su/code/moon-client-web`
- Worktrees: `/Users/su/code/moon-client-web/.claude/worktrees/<name>`
- `.claude` is gitignored; `.agents` is tracked.
- A fresh worktree has no `node_modules`. Symlink the main checkout's:
  `ln -s /Users/su/code/moon-client-web/node_modules node_modules`
  (relative from the worktree root: `../../../node_modules`).
- `EnterWorktree` may base a new worktree on `origin/main`. Check the ref before editing (see
  `blockers.md` #1).
- Skill discovery (verified with `claude --debug-file` on 2026-11-25, CLI 2.1.330):
  - project skills load only from `/Users/su/code/moon-client-web/.claude/skills` — the main
    checkout, even when the session starts inside a worktree;
  - user skills load from `/Users/su/.claude/skills`;
  - `.agents/skills` is **not** scanned. This repo keeps canonical skill content under `.agents`,
    with no committed `.claude/skills` mirror.
  - `--add-dir <dir>` does add `<dir>/.claude/skills` as an "additional" skill source.
  - To load this skill locally, create the ignored symlink once per main checkout:
    `mkdir -p .claude/skills && ln -s ../../.agents/skills/moon-ui-verify .claude/skills/moon-ui-verify`
    (run from `/Users/su/code/moon-client-web`).
  - If the canonical files exist only on a worktree branch, point the link at that worktree
    (`../../.claude/worktrees/<name>/.agents/skills/moon-ui-verify`) until the branch is merged.
- A worktree created before a skill existed will not see it until the branch contains the files and
  the discovery path exposes them.

## Drift checks

Run these when a fact looks wrong:

```bash
node -p "JSON.stringify({dependencies: require('./package.json').dependencies, devDependencies: require('./package.json').devDependencies}, null, 2)"
grep -n "to: '/" src/admin/AdminApp.tsx
grep -n "auth/me\|auditLogs\|ADMIN_API_BASE" src/admin/api.ts
grep -n "target:\|origin'\|\"origin\"" vite.config.ts
lsof -nP -iTCP:45678 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:5175 -sTCP:LISTEN
env | grep -i proxy
```