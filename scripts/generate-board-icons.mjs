// 从 pixelarticons 生成板块图标名列表，供前台图标渲染和后台图标选择器共用。
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { listIcons } from 'pixelarticons'

const target = fileURLToPath(
  new URL('../src/lib/board-icon-names.ts', import.meta.url),
)
const names = listIcons()
const entries = names.map((name) => `  '${name}',`).join('\n')

writeFileSync(
  target,
  `/**\n * 由 pixelarticons 生成，请勿手改。运行 \`npm run gen:board-icons\` 更新。\n */\nexport const BOARD_ICON_NAMES = [\n${entries}\n] as const\n\nexport type BoardIconName = (typeof BOARD_ICON_NAMES)[number]\n`,
)

console.log(`generated ${names.length} icon names -> ${target}`)