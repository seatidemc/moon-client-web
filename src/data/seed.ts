import type { ForumData } from '@/types'

import { extractTags } from '@/lib/utils'

const now = Date.now()
const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString()

const users: ForumData['users'] = [
  {
    id: 'u1',
    name: '晚风',
    handle: 'wanfeng',
    bio: '在 Moon 记录想法，偶尔写点前端。',
    joinedAt: '2026-03-12T09:00:00.000Z',
  },
  {
    id: 'u2',
    name: '林深',
    handle: 'linshen',
    bio: '后端工程师，喜欢简单的工具和清楚的讨论。',
    joinedAt: '2026-04-28T13:30:00.000Z',
  },
  {
    id: 'u3',
    name: '青禾',
    handle: 'qinghe',
    bio: '读书、电影，以及城市里的长距离散步。',
    joinedAt: '2026-06-09T11:20:00.000Z',
  },
  {
    id: 'u4',
    name: '荒原',
    handle: 'huangyuan',
    bio: '独立开发者，正在做一些小而安静的产品。',
    joinedAt: '2026-07-21T08:10:00.000Z',
  },
]

const boards: ForumData['boards'] = [
  {
    id: 'general',
    name: '综合讨论',
    description: '聊聊任何值得认真讨论的事情。',
  },
  {
    id: 'tech',
    name: '技术',
    description: '开发、工具、产品与工程实践。',
  },
  {
    id: 'life',
    name: '生活',
    description: '日常、阅读、影音与城市漫游。',
  },
  {
    id: 'feedback',
    name: '反馈',
    description: '关于 Moon 的问题、建议与使用反馈。',
  },
]

interface ThreadSeed {
  id: string
  boardId: string
  authorId: string
  title: string
  content: string
  createdAt: string
}

const threadSeeds: ThreadSeed[] = [
  {
    id: 't1',
    boardId: 'general',
    authorId: 'u2',
    title: 'Moon 的第一帖：我们想在这里聊些什么？',
    createdAt: minutesAgo(2_940),
    content: `最近把 Moon 的框架搭起来了，想先问问大家：你希望在这里看到什么？

我的想法很简单：**少一点噪音，多一点具体的内容**。

- 技术问题尽量附上上下文
- 分享类帖子写清楚背景
- 不同意见可以讨论，但请对事不对人

如果你也是刚来，欢迎在这里留个脚印。 #初见 #社区`,
  },
  {
    id: 't2',
    boardId: 'tech',
    authorId: 'u1',
    title: '用纯 CSS 做一个轻量的明暗主题切换',
    createdAt: minutesAgo(1_560),
    content: `最近在整理项目的主题方案，顺手写了一个不依赖任何库的明暗切换。

\`\`\`css
:root {
  color-scheme: light dark;
}

:root[data-theme="dark"] {
  --background: #18181b;
  --foreground: #fafafa;
}
\`\`\`

核心只有两步：让浏览器处理表单控件与滚动条的配色，再用 \`prefers-color-scheme\` 或一个 \`data-theme\` 属性切换变量。

完整例子不复杂，欢迎补充你踩过的坑。 #前端 #CSS`,
  },
  {
    id: 't3',
    boardId: 'life',
    authorId: 'u3',
    title: '最近在读的三本书',
    createdAt: minutesAgo(4_800),
    content: `最近读完了三本气质完全不同的书，简单记一下。

1. **《看不见的城市》**：每座城市都像一则短小的思想实验。
2. **《创作者的日常》**：比起灵感，更相信可以持续的工作节奏。
3. **《夜晚的潜水艇》**：中文的想象力可以这么轻盈。

如果你也有最近想推荐的书，欢迎跟帖。 #阅读 #书单`,
  },
  {
    id: 't4',
    boardId: 'feedback',
    authorId: 'u4',
    title: '搜索能否支持标签组合？',
    createdAt: minutesAgo(9_000),
    content: `现在用 #标签 搜索已经很好用了。之后会不会支持类似 \`#前端 #CSS\` 这样的标签组合？

如果搜索能记住最近使用的标签，找旧帖应该会更方便。 #反馈 #搜索`,
  },
  {
    id: 't5',
    boardId: 'tech',
    authorId: 'u1',
    title: 'TipTap 的 Markdown 模式实践',
    createdAt: minutesAgo(150),
    content: `在 Moon 的发帖器里试了一个新组合：TipTap 负责所见即所得，\`@tiptap/markdown\` 负责序列化。

这样做的两个好处：

- 富文本和 Markdown 两种模式可以共用同一份内容
- 正文以 Markdown 保存，搜索和迁移都更省心

在富文本里直接输入 \`**加粗**\`、\`# 标题\` 或 \`- 列表\`，也能即时得到对应格式。 #前端 #Markdown #编辑器`,
  },
  {
    id: 't6',
    boardId: 'general',
    authorId: 'u3',
    title: '大家平时用什么方式记录想法？',
    createdAt: minutesAgo(18_000),
    content: `手写卡片、备忘录、还是随手发一条帖子？

我最近在尝试每天睡前写三行字，不追求完整，只留下当天最想记住的片段。意外地比长日记更容易坚持。 #日常 #记录`,
  },
]

const threads: ForumData['threads'] = threadSeeds.map((thread) => ({
  ...thread,
  tags: extractTags(thread.content),
}))

const replies: ForumData['replies'] = [
  {
    id: 'r1',
    threadId: 't1',
    authorId: 'u1',
    content: '希望这里能多一点「做完了什么」和「踩了什么坑」的分享，少一点空泛的观点。',
    createdAt: minutesAgo(2_500),
  },
  {
    id: 'r2',
    threadId: 't1',
    authorId: 'u3',
    content: '同意。慢一点也没关系，只要每条回复都是认真写的。',
    createdAt: minutesAgo(2_200),
  },
  {
    id: 'r3',
    threadId: 't2',
    authorId: 'u4',
    content: '补一个细节：记得同时设置 `color-scheme`，不然浏览器原生控件的颜色不会跟着变量变化。',
    createdAt: minutesAgo(1_200),
  },
  {
    id: 'r4',
    threadId: 't2',
    authorId: 'u2',
    content: '这个方案很适合小项目，维护成本几乎为零。',
    createdAt: minutesAgo(980),
  },
  {
    id: 'r5',
    threadId: 't3',
    authorId: 'u1',
    content: '《夜晚的潜水艇》也在我的清单里，看来要提前读了。',
    createdAt: minutesAgo(4_600),
  },
  {
    id: 'r6',
    threadId: 't4',
    authorId: 'u1',
    content: '标签组合是个好方向，已经记下了。目前可以先在搜索框里同时输入多个关键词。',
    createdAt: minutesAgo(8_600),
  },
  {
    id: 'r7',
    threadId: 't5',
    authorId: 'u2',
    content: '富文本和 Markdown 共用一份内容这点很实用，尤其是后面还要做搜索的时候。',
    createdAt: minutesAgo(90),
  },
  {
    id: 'r8',
    threadId: 't5',
    authorId: 'u3',
    content: '试了一下直接输入 Markdown 快捷键，标题和列表都很顺。',
    createdAt: minutesAgo(35),
  },
]

export const seedData: ForumData = {
  users,
  boards,
  threads,
  replies,
}
