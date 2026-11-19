# 论坛 E2E（前台 + 管理后台）

真实后端 + 真实前端的 Playwright 主流程测试，对应 `moon-front-plan.md` 第 9.1 节。

- 前台：`tests/e2e/forum.spec.ts`，入口 `http://localhost:5174/`。
- 管理后台：`tests/e2e/admin.spec.ts`，入口 `http://localhost:5174/admin.html`，使用后端独立的
  `forum_admin_session`，与前台登录态互不影响。

## 前置条件

1. MySQL 可用（开发配置见后端仓库 `.dev/config/store.toml`）。
2. 在 `go-aliyunmc-v2` 启动后端：

   ```bash
   make dev
   ```

3. 在本仓库启动前端。后端 dev CORS 允许 `http://localhost:5174`：

   ```bash
   npm run dev -- --host localhost --port 5174
   ```

4. `dev/dev` 开发管理员账号存在（`GO_ALIYUNMC_DEV=1` 时后端启动会自动创建）。

## 运行

```bash
npm run test:e2e
```

只跑管理后台：

```bash
npx playwright test tests/e2e/admin.spec.ts
```

调试时可使用 `npm run test:e2e:headed`，失败时 `playwright-report/` 中会保留 trace 和截图。

## 测试数据

`tests/e2e/global-setup.ts` 会在测试前自动：

- 确认 `e2ealice`、`e2ebob`、`e2ecarol` 存在；缺失时通过后端 `create_user` 命令创建。
- 首次登录并补齐默认论坛权限。
- 创建 `e2e-general`、`e2e-other` 两个板块。
- 只给 `e2ecarol` 在 `e2e-general` 授予板块级审核权限，用于验证跨板块无管理按钮。
- 管理后台用例额外通过管理 API 给 `e2ecarol` 授予 `e2e-general` 的板块级后台权限，用于验证
  看板/用户/设置等全局入口对板块管理员不可见。

可用环境变量：

| 变量 | 默认值 |
|---|---|
| `E2E_BACKEND_URL` | `http://localhost:45678` |
| `E2E_FRONTEND_URL` | `http://localhost:5174` |
| `GO_ALIYUNMC_REPO` | 与 `moon-client-web` 同级的 `go-aliyunmc-v2` |

测试使用唯一 `RUN` 标识创建主题与内容，可以重复运行；不会清理历史数据。