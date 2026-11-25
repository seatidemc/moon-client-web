# Blockers and fixes

Twelve failure modes seen while verifying UI changes in this repo. Each entry follows
**Symptom / Detect / Fix / Verify**. Check these before debugging CSS.

---

## 1. Worktree based on the wrong ref

**Symptom:** The expected component, prop, or selector does not exist in the checkout; grepping the
changed symbol returns nothing even though the user just changed it.

**Detect:**

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git log --oneline -3
git merge-base --is-ancestor <target-branch> HEAD; echo $?
grep -R "<changed-symbol>" src
git worktree list
```

`EnterWorktree` defaults to a fresh branch from `origin/<default-branch>`, which can omit the feature
branch under test.

**Fix:** Rebase or reset the worktree branch onto the target before editing. Safeguard uncommitted
work with a WIP commit (this environment shares the stash stack; do not use bare `git stash`).
Never `git reset --hard` with local changes you have not preserved.

**Verify:** The symbol exists, `git log` shows the target commit, and the probe reaches the changed
behavior.

---

## 2. Missing `node_modules` in a worktree

**Symptom:** `vite`, `tsc`, `oxlint`, or `playwright` cannot be resolved.

**Detect:**

```bash
test -f node_modules/playwright/package.json && echo ok || echo missing
node -e "console.log(require('playwright/package.json').version)"
```

**Fix:** Run `npm ci`, or reuse the main checkout's dependencies:

```bash
ln -s /Users/su/code/moon-client-web/node_modules node_modules
# from a standard worktree root this is: ln -s ../../../node_modules node_modules
```

**Verify:** `node --check .agents/skills/moon-ui-verify/scripts/ui-probe.mjs` and a probe launch both
work.

---

## 3. Dev server port conflicts / wrong checkout

**Symptom:** The page shows old code, or Vite refuses to start with `--strictPort`.

**Detect:**

```bash
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:5175 -sTCP:LISTEN
```

A server on `5174` commonly belongs to the main checkout (`/Users/su/code/moon-client-web`), not the
worktree.

**Fix:** Start the worktree's own server on a free port:

```bash
npm run dev -- --host localhost --port 5175 --strictPort
```

Run it as a background task, keep the task id, and treat it as ready only when the output prints
`Local: http://localhost:5175/`. Do not reuse `5174`, and do not kill another checkout's server.

**Verify:** The page URL includes the worktree port; the probe's measurements change after you edit
the worktree file.

---

## 4. Vite binds IPv6 only; `127.0.0.1` is refused

**Symptom:** `curl http://127.0.0.1:5175/` fails with connection refused while the server log says it
is ready.

**Detect:** Try `localhost` and `[::1]` as well.

**Fix:** Use `http://localhost:5175/` or `http://[::1]:5175/` everywhere, including probe configs.
Read readiness from the background task output instead of polling with curl.

**Verify:** `NO_PROXY='*' curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:5175/` returns
200.

---

## 5. HTTP proxy intercepts localhost

**Symptom:** `502 Bad Gateway`, `ERR_TUNNEL_CONNECTION_FAILED`, or empty responses for a server that
is clearly running; the server log shows no request.

**Detect:**

```bash
env | grep -i proxy
```

`all_proxy` / `http_proxy` / `https_proxy` may point at `127.0.0.1:7890`.

**Fix:** Bypass for local checks:

```bash
NO_PROXY='*' no_proxy='*' curl -sS http://localhost:5175/
```

`ui-probe.mjs` already passes `--no-proxy-server` to Chrome. If you write a custom Playwright script,
do the same.

**Verify:** A direct fetch succeeds and the server log shows the request.

---

## 6. Admin auth blocks the page (login form instead of the route)

**Symptom:** `/admin.html#/audit` renders `Tide / 管理员账号 / 密码 / 登录管理后台` instead of the
target page.

**Detect:** Network log or `result.json` `apiErrors` shows 401 on `/forum-v1/admin/auth/me`; the probe
hits no page API; `consoleErrors` may be empty.

**Fix:** Pick one:

- Mock auth (fast): intercept `**/forum-v1/admin/auth/me` with the exact `AdminMe` envelope from
  `admin-mocks.md` and set `isSuperuser: true`.
- Real login: run the backend, use `dev` / `dev` via `config.auth = { "mode": "login" }`.

**Verify:** The target heading/table is visible and `mockHits` includes the auth mock (mock mode), or
the page loads after submit (login mode).

**Pitfall:** The endpoint is `/forum-v1/admin/auth/me`, **not** `/forum-v1/admin/me`. A wrong path
silently falls through and the UI stays anonymous.

---

## 7. Mock shape does not match the API contract

**Symptom:** The mock is hit, but the page still shows anonymous, empty tables, or an error panel.

**Detect:** Inspect the mocked body and `src/lib/api.ts`. Success responses must be `{ "data": ... }`;
`request()` unwraps `data`. A bare `AdminMe` object yields no `data`, so the client sees `undefined`.

**Fix:** Wrap the payload in `data` and match the TypeScript types in `src/admin/types.ts`. For admin
identity, `user` must be non-null; `isSuperuser: true` bypasses permission gates.

**Verify:** The page renders the expected content and `apiErrors` is empty.

---

## 8. Guessing the CSS root cause

**Symptom:** Fixes are speculative ("probably the button is flex") and do not change the measured
behavior.

**Detect:** You cannot state the computed `display`, `tableLayout`, `minWidth`, or a rect number for
the affected elements.

**Fix:** Use `ui-probe.mjs` probes with `getComputedStyle` + `getBoundingClientRect`; compare the
`initial` and `final` snapshots. Read `css-gotchas.md` for the two root causes already seen here.

**Verify:** The measured value changes as predicted after the fix.

---

## 9. Measuring without a fixed viewport

**Symptom:** Screenshots "look fine", but numbers differ between runs or the layout reflows at another
window size.

**Fix:** Keep `1280x900`, `reducedMotion: true`, and the same browser channel. Assert **deltas** for
table/column widths, not absolute pixels.

**Verify:** Two consecutive runs produce the same deltas.

---

## 10. Wrong validation exit codes

**Symptom:** `echo $?` reports 0 even though `tsc` or `oxlint` failed.

**Cause:** In `cmd | tail; echo $?`, `$?` is `tail`'s status.

**Fix:** Run the tool directly (`npx tsc -b`, `npx oxlint <file>`), or use `set -o pipefail`.

**Verify:** Re-run the failing command without a pipe and confirm the non-zero status.

---

## 11. Shell guardrails reject compound commands

**Symptom:** A heredoc, `cd` to the shared checkout, or a multi-command pipeline is refused by the
worktree isolation guard.

**Fix:** Write scripts and configs with the Write tool, then run one plain command from the worktree:

```bash
node .agents/skills/moon-ui-verify/scripts/ui-probe.mjs --config test-results/ui-probe/configs/audit-chevron.json
```

Keep all commands inside the current worktree; do not `cd` to `/Users/su/code/moon-client-web`.

**Verify:** The command runs without a guard error and paths resolve inside the worktree.

---

## 12. Leftover servers, temp entries, and stray files

**Symptom:** Ports stay occupied, probes hit stale servers, or `git status` shows files that were
meant to be temporary.

**Detect:**

```bash
lsof -nP -iTCP:5175 -sTCP:LISTEN
git status --short
```

**Fix:** Stop background servers with the task tool (`TaskStop <task-id>`), delete temporary repro
pages/entries, and keep only reusable probe configs. `test-results/` is gitignored.

**Verify:** No listener on the probe port; `git status --short` contains only intended changes.