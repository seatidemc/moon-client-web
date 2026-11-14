import type { Editor } from '@tiptap/core'
import { Button, Surface } from '@heroui/react'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { applyImageAlignment } from './editor-commands'
import {
  FLOATING_LAYER_Z_INDEX,
  IMAGE_ALIGN_TOOLBAR_HEIGHT,
  IMAGE_ALIGN_TOOLBAR_WIDTH,
} from './editor-constants'
import type { ImageAlignState, ImageAlignment } from './editor-types'
import { floatingLayerContainer } from './editor-utils'

interface ImageAlignToolbarProps {
  editor: Editor
  state: ImageAlignState
  panelRef: RefObject<HTMLDivElement | null>
}

const ALIGNMENTS = [
  { value: 'left', label: '左对齐', icon: AlignLeft },
  { value: 'center', label: '居中对齐', icon: AlignCenter },
  { value: 'right', label: '右对齐', icon: AlignRight },
] as const

function toAlignment(value: unknown): ImageAlignment {
  return value === 'center' || value === 'right' ? value : 'left'
}

/** 选中图片后浮在图片旁的布局工具条，只有左/中/右三个按钮。 */
export function ImageAlignToolbar({
  editor,
  state,
  panelRef,
}: ImageAlignToolbarProps) {
  const [align, setAlign] = useState(() =>
    toAlignment(editor.state.doc.nodeAt(state.pos)?.attrs.align),
  )

  function changeAlignment(next: ImageAlignment) {
    applyImageAlignment(editor, state.pos, next)
    setAlign(next)
  }

  // 挂进弹窗的 dialog；挂遮罩层会被 React Aria 设为 inert，点不动。
  const container = floatingLayerContainer(editor.view)

  return createPortal(
    <Surface
      ref={panelRef}
      role="toolbar"
      aria-label="图片对齐"
      className="fixed flex items-center justify-center gap-0.5 rounded-full border border-field-border p-1 shadow-lg"
      style={{
        left: state.left,
        top: state.top,
        width: IMAGE_ALIGN_TOOLBAR_WIDTH,
        height: IMAGE_ALIGN_TOOLBAR_HEIGHT,
        zIndex: FLOATING_LAYER_Z_INDEX,
        pointerEvents: 'auto',
      }}
    >
      {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          isIconOnly
          variant={align === value ? 'secondary' : 'ghost'}
          aria-label={label}
          aria-pressed={align === value}
          onPress={() => changeAlignment(value)}
        >
          <Icon />
        </Button>
      ))}
    </Surface>,
    container,
  )
}