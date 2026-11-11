# Moon

一个仅包含用户端的轻量论坛前端，基于 **Vite + React 19 + HeroUI v3 + Tailwind CSS v4 + TypeScript**。

## 功能

- 板块浏览与主题列表
- 发帖，支持 TipTap 富文本与 Markdown 两种编辑模式
- 富文本支持 Markdown 快捷输入，内容统一以 Markdown 保存
- 扁平回复（不嵌套）与回复删除
- 仅作者可删除自己的主题和回复
- 从主帖 `#标签` 自动提取帖子标签，支持点击标签搜索
- 搜索主题标题、正文、标签、作者与回复
- 个人中心：资料、统计数据、发布过的主题与回复
- 登录以 Dialog 展示，不提供注册页面

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 最近的主题 |
| `/topic/:id` | 板块与主题列表 |
| `/thread/:id` | 主题详情与回复 |
| `/user/:id` | 个人中心 |
| `/search?q=关键词` | 搜索结果 |

## 演示账号

| 账号 | 密码 |
| --- | --- |
| `wanfeng` | `moon123` |
| `linshen` | `moon123` |

登录弹窗内可一键填入演示账号。

## 数据

当前为纯前端演示，数据保存在浏览器 `localStorage`：

- `moon-forum:data:v1`：板块、主题、回复与用户
- `moon-forum:session:v1`：当前登录用户

清除这两个键即可恢复初始演示数据。

## 开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 类型检查并构建
npm run preview  # 预览构建产物
npm run lint     # oxlint
```

## 目录

```text
src/
├─ components/    # 布局、编辑器、对话框与通用展示组件
├─ data/          # 初始演示数据
├─ lib/           # 论坛状态、工具函数与页面标题 Hook
├─ pages/         # 路由页面
├─ App.tsx
├─ index.css
├─ main.tsx
└─ types.ts
```
