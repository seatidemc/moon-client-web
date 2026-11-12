import type { CSSProperties, ReactNode } from 'react'

import { getBoardIcon } from '@/lib/board-icons'
import type { BoardIconName } from '@/types'

export type BoardDecorationVariant = 'radial' | 'tiled'

interface DecorationIcon {
  left: number
  top: number
  size: number
  opacity: number
}

interface DecorationLayout {
  icons: DecorationIcon[]
  /** 从外向内依次套用的遮罩，多层时取交集；坐标以扩展后的遮罩盒为原点 */
  masks: string[]
  /** 装饰区域尺寸 */
  containerClassName: string
  /** 遮罩盒相对装饰区域向外扩展的余量（rem），避免图案在内部被硬裁断 */
  bleed?: number
  /** 单个图标的倾斜角 */
  iconRotate: number
  /** 整组内容的额外变换，用于把整张排布当作一幅图倾斜 */
  contentTransform?: string
}

const DECORATION_TILT = -10

/**
 * 平铺网格：17 列 × 8 行，中心 2×2 留给大图标。右侧多出的列沿行方向自然
 * 延伸到斜边淡出为止，把右侧靠上的三角区填满；网格本身不做疏密或透明度
 * 变化，超出斜边的部分只由遮罩淡出。
 */
const TILED_COLUMN_SPACING = 1.5
const TILED_ROW_SPACING = 1.5
/** 大图标连同 2×2 空位整体向左上偏移，让焦点落在视觉重心上 */
const TILED_CENTER_X = 6.5 - TILED_COLUMN_SPACING
const TILED_CENTER_Y = 5 - TILED_ROW_SPACING / 2
const TILED_CENTER_ICON_SIZE = 3.0

function buildTiledIcons(): DecorationIcon[] {
  const icons: DecorationIcon[] = []
  // 小图标一律同尺寸、同透明度，渐隐只由斜边遮罩负责
  const size = 1.0
  const opacity = 0.19

  for (let column = -5; column <= 11; column += 1) {
    for (let row = -4; row <= 3; row += 1) {
      // 单元格中心相对网格中心偏移半格，让 2×2 的空位居中
      const offsetColumn = column + 0.5
      const offsetRow = row + 0.5
      const distance = Math.max(
        Math.abs(offsetColumn),
        Math.abs(offsetRow),
      )

      // 中心 2×2 由大图标占据
      if (distance <= 0.5) continue

      icons.push({
        left: TILED_CENTER_X + offsetColumn * TILED_COLUMN_SPACING - size / 2,
        top: TILED_CENTER_Y + offsetRow * TILED_ROW_SPACING - size / 2,
        size,
        opacity,
      })
    }
  }

  // 大图标，占据 2×2 的空位
  icons.push({
    left: TILED_CENTER_X - TILED_CENTER_ICON_SIZE / 2,
    top: TILED_CENTER_Y - TILED_CENTER_ICON_SIZE / 2,
    size: TILED_CENTER_ICON_SIZE,
    opacity: 0.38,
  })

  return icons
}

/**
 * 球形辐射：第一项是彗核（大图标），其余小图标向四周散开，
 * 越靠外越小、越淡，形成密集的彗发。
 */
const RADIAL_LAYOUT: DecorationLayout = {
  containerClassName: 'h-36 w-44',
  iconRotate: DECORATION_TILT,
  masks: [
    'radial-gradient(circle at 3.8rem 3.6rem, #000 3.4rem, transparent 7.2rem)',
  ],
  icons: [
    // 彗核
    { left: 1.7, top: 1.5, size: 4.2, opacity: 0.38 },
    // 内圈：紧贴彗核
    { left: 6.21, top: 3.68, size: 1.55, opacity: 0.32 },
    { left: 4.43, top: 5.78, size: 1.45, opacity: 0.31 },
    { left: 1.6, top: 5.73, size: 1.4, opacity: 0.31 },
    { left: 0.42, top: 3.65, size: 1.35, opacity: 0.3 },
    { left: 0.77, top: 0.81, size: 1.3, opacity: 0.3 },
    { left: 3.4, top: 0.39, size: 1.25, opacity: 0.3 },
    { left: 5.48, top: 0.91, size: 1.4, opacity: 0.31 },
    // 中圈
    { left: 6.12, top: 5.63, size: 1.15, opacity: 0.2 },
    { left: 3.14, top: 6.97, size: 1.05, opacity: 0.19 },
    { left: 0.19, top: 5.28, size: 1.0, opacity: 0.18 },
    { left: 0.05, top: 2.53, size: 1.0, opacity: 0.18 },
    { left: 2.05, top: -0.03, size: 0.95, opacity: 0.17 },
    { left: 6.99, top: 2.29, size: 1.05, opacity: 0.18 },
    // 外圈：零星飞散，越远越淡
    { left: 5.6, top: 7.05, size: 0.9, opacity: 0.14 },
    { left: 7.83, top: 3.9, size: 1.0, opacity: 0.13 },
    { left: 0.41, top: 6.42, size: 0.9, opacity: 0.13 },
    { left: -0.04, top: 0.5, size: 0.9, opacity: 0.12 },
    // 远处尘埃：打破轮廓，靠遮罩淡入背景
    { left: 9.58, top: 2.2, size: 0.65, opacity: 0.09 },
    { left: 8.94, top: 5.84, size: 0.6, opacity: 0.1 },
    { left: 8.03, top: 7.83, size: 0.6, opacity: 0.09 },
    { left: 4.85, top: 8.32, size: 0.6, opacity: 0.1 },
    { left: 2.18, top: 8.35, size: 0.55, opacity: 0.09 },
  ],
}

/**
 * 平铺：小图标按紧密网格铺开，中心 2×2 留给大图标；整张排布作为一幅完整
 * 的图一起倾斜，而不是绕中心散开。可见区域收成内容左上角的三角区：顶边和
 * 左边由页面/header 自然裁切，斜边开始向右下淡出。
 *
 * 斜边从内容顶部（约 455px 处）连到左侧（约 235px 处）；渐变沿斜边法线
 * 方向，停靠点以扩展后的遮罩盒（37rem × 34rem）为坐标系。遮罩盒向右多留
 * 余量，让补满三角区的小图标不会被盒边硬切；盒向四周对称扩展后，停靠点
 * 需同步加上「扩展量 ×（|sin|+|cos|）≈ 1.296」，才能让斜边留在原位。
 */
const TILED_MASK_BLEED = 12
const TILED_TRIANGLE_FADE =
  'linear-gradient(158.6deg, #000 22.674rem, transparent 25.074rem)'

const TILED_LAYOUT: DecorationLayout = {
  containerClassName: 'h-40 w-52',
  bleed: TILED_MASK_BLEED,
  iconRotate: 0,
  contentTransform: `rotate(${DECORATION_TILT}deg) scale(1.12)`,
  masks: [TILED_TRIANGLE_FADE],
  icons: buildTiledIcons(),
}

const LAYOUTS: Record<BoardDecorationVariant, DecorationLayout> = {
  radial: RADIAL_LAYOUT,
  tiled: TILED_LAYOUT,
}

function Mask({
  image,
  className,
  style,
  children,
}: {
  image?: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  const maskStyle: CSSProperties | undefined = image
    ? { ...style, maskImage: image, WebkitMaskImage: image }
    : style

  return (
    <div className={className} style={maskStyle}>
      {children}
    </div>
  )
}

interface BoardDecorationProps {
  icon: BoardIconName
  color: string
  variant?: BoardDecorationVariant
}

export function BoardDecoration({
  icon,
  color,
  variant = 'radial',
}: BoardDecorationProps) {
  const BoardIcon = getBoardIcon(icon)
  const layout = LAYOUTS[variant]
  const bleed = layout.bleed ?? 0

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -top-1 -left-1 ${layout.containerClassName} origin-top-left scale-150 select-none`}
      style={{ color }}
    >
      <Mask
        image={layout.masks[0]}
        className="absolute"
        style={{ inset: `${-bleed}rem` }}
      >
        <Mask image={layout.masks[1]} className="h-full w-full">
          <div
            className="absolute"
            style={{
              inset: `${bleed}rem`,
              transform: layout.contentTransform,
            }}
          >
            {layout.icons.map((decoration, index) => (
              <BoardIcon
                key={index}
                className="absolute"
                style={{
                  left: `${decoration.left}rem`,
                  top: `${decoration.top}rem`,
                  width: `${decoration.size}rem`,
                  height: `${decoration.size}rem`,
                  opacity: decoration.opacity,
                  transform: `rotate(${layout.iconRotate}deg)`,
                }}
              />
            ))}
          </div>
        </Mask>
      </Mask>
    </div>
  )
}