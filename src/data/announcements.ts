import type { PinnedAnnouncement } from '@/types'

const now = Date.now()
const hoursAgo = (hours: number) =>
  new Date(now - hours * 3_600_000).toISOString()

export const pinnedAnnouncements: PinnedAnnouncement[] = [
  {
    id: 'a1',
    title: '社区守则更新',
    content:
      '为了让大家有更专注的讨论环境，我们微调了发帖与回复的规范：请尽量提供具体上下文，讨论时对事不对人。',
    publisherId: 'u2',
    publishedAt: hoursAgo(3),
  },
  {
    id: 'a2',
    title: '关于近期维护安排',
    content:
      '本周日凌晨 2:00 到 4:00 会进行例行维护，期间可能无法登录或发布内容，感谢大家的耐心等待。',
    publisherId: 'u4',
    publishedAt: hoursAgo(26),
  },
  {
    id: 'a3',
    title: 'Moon 两周年：留下想说的一句话',
    content:
      'Moon 两岁了。欢迎在置顶主题下写下你在这里的一个瞬间、一位朋友，或者一句想对后来者说的话。',
    publisherId: 'u1',
    publishedAt: hoursAgo(52),
  },
  {
    id: 'a4',
    title: '新增「标签组合」搜索',
    content:
      '搜索框现在可以同时输入多个关键词，例如“前端 CSS”，结果会同时匹配主题与标签。',
    publisherId: 'u3',
    publishedAt: hoursAgo(120),
  },
  {
    id: 'a5',
    boardId: 'general',
    title: '综合讨论版规',
    content:
      '发帖前请先搜索是否已有相关主题。讨论时尽量给出背景与具体例子，让后来者也能跟上思路。',
    publisherId: 'u1',
    publishedAt: hoursAgo(8),
  },
  {
    id: 'a6',
    boardId: 'tech',
    title: '技术版提问指南',
    content:
      '提问时请附上运行环境、版本号与复现步骤；贴报错日志时保留关键堆栈，方便大家定位问题。',
    publisherId: 'u2',
    publishedAt: hoursAgo(30),
  },
  {
    id: 'a7',
    boardId: 'life',
    title: '生活版每周话题',
    content:
      '本周话题：最近一次让你感到安静的散步。欢迎在主题下分享路线、照片，或者短短几句话。',
    publisherId: 'u3',
    publishedAt: hoursAgo(60),
  },
  {
    id: 'a8',
    boardId: 'feedback',
    title: '反馈区处理说明',
    content:
      '收到反馈后我们会在一周内给出回复。涉及账号或隐私的问题请通过站内信联系管理员。',
    publisherId: 'u4',
    publishedAt: hoursAgo(100),
  },
]
