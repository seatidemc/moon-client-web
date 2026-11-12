import type { CSSProperties } from 'react'

/**
 * 把板块色映射成 HeroUI 的主题变量。挂在容器上之后，其下所有组件（按钮、
 * 焦点环、正文链接、编辑器选区等）都会自动改用板块色。
 *
 * `--content-accent` 与正文前景色混合，保证彩色文字在当前明暗主题下都可读；
 * `--link` 指向它，让正文里的链接和 `re#` 引用一起跟随板块色。
 *
 * HeroUI 在 `:root` 上就把派生色算成了具体颜色，继承下来不会再跟随 `--accent`，
 * 所以每个由 `--accent` 派生的变量都得在这里重算一遍。
 */
export function getBoardThemeStyle(
  color: string | undefined,
): CSSProperties | undefined {
  if (!color) return undefined

  return {
    '--accent': color,
    '--accent-hover':
      'color-mix(in oklab, var(--accent) 90%, var(--accent-foreground) 10%)',
    '--accent-soft': 'color-mix(in oklab, var(--accent) 15%, var(--surface))',
    '--accent-soft-hover':
      'color-mix(in oklab, var(--accent) 20%, var(--surface))',
    '--accent-soft-foreground':
      'color-mix(in oklab, var(--accent) 70%, var(--foreground) 30%)',
    '--focus': 'var(--accent)',
    '--content-accent':
      'color-mix(in oklab, var(--accent) 85%, var(--foreground) 15%)',
    '--link': 'var(--content-accent)',
  } as CSSProperties
}