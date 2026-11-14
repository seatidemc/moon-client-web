import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
} from 'lucide-react'

export const POPUP_WIDTH = 288
export const POPUP_HEIGHT = 240
export const EMOJI_POPUP_WIDTH = 256
export const EMOJI_POPUP_HEIGHT = 256
export const LINK_POPUP_WIDTH = 320
export const LINK_POPUP_HEIGHT = 232
export const IMAGE_POPUP_WIDTH = 320
/** 插入/编辑浮窗的大致高度，用于决定向上还是向下展开。 */
export const IMAGE_POPUP_HEIGHT = 360
/** 图片对齐工具条的尺寸，用于定位与视口内收。 */
export const IMAGE_ALIGN_TOOLBAR_WIDTH = 128
export const IMAGE_ALIGN_TOOLBAR_HEIGHT = 40
/** 编辑器内浮动层的层级（相对其挂载容器）。 */
export const FLOATING_LAYER_Z_INDEX = 30
/** 图片缩放的最小边长，与 Image 扩展的 resize 配置保持一致。 */
export const IMAGE_RESIZE_MIN_SIZE = 80
export const TABLE_PICKER_WIDTH = 224
export const TABLE_GRID_ROWS = 8
export const TABLE_GRID_COLUMNS = 8
export const TABLE_MENU_WIDTH = 224
export const TABLE_MENU_MAX_HEIGHT = 480

/** 快捷回复编辑器内容区的默认高度（px）。 */
export const COMPACT_EDITOR_HEIGHT = 80
/** 快捷回复编辑器只容一行文字时的高度（px）。 */
export const COMPACT_EDITOR_LINE_HEIGHT = 49
/** 快捷回复编辑器拖动上边缘可达到的最大高度（px）。 */
export const COMPACT_EDITOR_MAX_HEIGHT = 192

export const HEADING_LEVELS = [
  { level: 1, label: '一级标题', icon: Heading1 },
  { level: 2, label: '二级标题', icon: Heading2 },
  { level: 3, label: '三级标题', icon: Heading3 },
  { level: 4, label: '四级标题', icon: Heading4 },
  { level: 5, label: '五级标题', icon: Heading5 },
  { level: 6, label: '六级标题', icon: Heading6 },
] as const

export const TABLE_ACTIONS = [
  { id: 'addRowBefore', label: '在上方插入行' },
  { id: 'addRowAfter', label: '在下方插入行' },
  { id: 'deleteRow', label: '删除当前行' },
  { id: 'addColumnBefore', label: '在左侧插入列' },
  { id: 'addColumnAfter', label: '在右侧插入列' },
  { id: 'deleteColumn', label: '删除当前列' },
  { id: 'mergeCells', label: '合并单元格' },
  { id: 'splitCell', label: '拆分单元格' },
  { id: 'toggleHeaderRow', label: '切换表头行' },
  { id: 'toggleHeaderColumn', label: '切换表头列' },
  { id: 'toggleHeaderCell', label: '切换表头单元格' },
  { id: 'deleteTable', label: '删除表格' },
] as const

export type TableActionId = (typeof TABLE_ACTIONS)[number]['id']

/** 右键单元格时按用途分组展示的表格操作。 */
export const TABLE_MENU_GROUPS = [
  { label: '行', actions: ['addRowBefore', 'addRowAfter', 'deleteRow'] },
  {
    label: '列',
    actions: ['addColumnBefore', 'addColumnAfter', 'deleteColumn'],
  },
  { label: '单元格', actions: ['mergeCells', 'splitCell'] },
  {
    label: '表头',
    actions: ['toggleHeaderRow', 'toggleHeaderColumn', 'toggleHeaderCell'],
  },
  { label: '表格', actions: ['deleteTable'] },
] as const satisfies ReadonlyArray<{
  label: string
  actions: readonly TableActionId[]
}>

export const TABLE_TOOLBAR_ACTIONS = TABLE_ACTIONS.filter(
  ({ id }) => id === 'deleteTable',
)