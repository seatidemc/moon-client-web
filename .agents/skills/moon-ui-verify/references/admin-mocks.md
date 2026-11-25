# Admin API mocks

Mock the admin identity and every page API the route fires. Mocks are the fastest reproduction path;
use a real `dev`/`dev` login when the change touches auth or when the final check must exercise the
backend.

## Why the exact path and envelope matter

- The session check is `GET /forum-v1/admin/auth/me`. `GET /forum-v1/admin/me` does not exist and
  falls through to a 401, leaving the UI on the login page.
- `src/lib/api.ts` unwraps `{ "data": ... }`. A bare `AdminMe` object has no `data`, so the client sees
  `undefined` and treats the session as anonymous.
- `AdminMe.user` must be non-null. `isSuperuser: true` bypasses both route guards and nav visibility.

## Identity mock

```json
{
  "name": "admin-me",
  "url": "**/forum-v1/admin/auth/me",
  "method": "GET",
  "status": 200,
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
}
```

For a non-superuser, set `isSuperuser: false` and grant the permission the route needs, e.g.
`"globalPermissions": ["audit.view"]`. Board-scoped permissions use string board ids:
`"boardPermissions": { "7": ["content.view_admin"] }`.

## Audit log list mock

`GET /forum-v1/admin/audit-logs?page=1&pageSize=20` returns `Page<AuditLog>`:

```json
{
  "name": "audit-logs",
  "url": "**/forum-v1/admin/audit-logs*",
  "method": "GET",
  "status": 200,
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
            "before": { "title": "旧标题", "content": "x".repeat(180) },
            "after": { "title": "新标题", "content": "y".repeat(180) },
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
```

Use a long `detail` value when verifying the expanded panel width.

## Other page APIs

All admin requests use `/forum-v1/admin/...` with the same `{data}` envelope. Response tops:

| Route | Path | Data |
|---|---|---|
| dashboard | `/dashboard` | `Dashboard` object |
| boards / threads / replies / users / uploads | `/boards`, `/threads`, `/replies`, `/users`, `/uploads` | `{ items, total, page, pageSize }` |
| uploads stats | `/uploads/stats` (or the route's call) | `UploadStatsSummary` |
| settings | `/settings` | `SiteSettings` |
| permissions | `/permissions` | `{ items: PermissionItem[] }` |

Read `src/admin/api.ts` and `src/admin/types.ts` for exact field names before writing a mock. Prefer
starting the app once with real auth and copying the network response when the shape is complex.

## Route order and matching

- Playwright matches the most recently registered matching route first. Keep patterns
  non-overlapping; if you need a general fallback plus specific overrides, register the general one
  first.
- Patterns see the full browser URL, including `/forum-v1` — anchor with `**/forum-v1/...`.
- `method` mismatch calls `route.fallback()`, so a GET mock will not swallow a POST.

## Real login instead of mocks

```json
{
  "auth": { "mode": "login", "username": "dev", "password": "dev" }
}
```

- Requires the backend on `45678`; the Vite proxy forces `Origin: http://localhost:5174`, so a
  worktree server on `5175` still passes CORS.
- The login helper uses `input[autocomplete="username"]`,
  `input[autocomplete="current-password"]`, `button[type="submit"]`.
- The backend rate-limits admin login (default 5 per minute per account). Log in once and reuse the
  browser context; do not loop logins.
- `dev`/`dev` is created by the backend when running with the dev flag.
- Login mode clears recorder state once the app is ready, because the initial `/admin/auth/me` 401
  is expected and would otherwise fail the run.

## Symptom mapping

| What you see | Likely cause |
|---|---|
| `Tide` login form | 401 on `/admin/auth/me`, wrong path, or `user: null` |
| 无管理权限 | 403; identity mock lacks the route permission |
| 无法读取管理状态 | 5xx or network failure on `/admin/auth/me` |
| Page shell but empty table | page API unmocked, wrong envelope, or wrong shape |
| Toast/401 after load | session cookie expired or a page API requires real auth |
| Mocks hit but no data | `{data}` missing or field names differ from `src/admin/types.ts` |

## Mock fidelity caveat

Mocks prove rendering, not backend contracts. Finish with real login or the existing Playwright E2E
when the change touches auth, permissions, or API integration. The E2E suite uses a real backend and
serial tests; it is not a substitute for a focused probe when only layout is under test.