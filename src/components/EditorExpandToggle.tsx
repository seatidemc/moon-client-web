import { CloseButton } from '@heroui/react'
import { Maximize2, Minimize2 } from 'lucide-react'

interface EditorExpandToggleProps {
  expanded: boolean
  onToggle: () => void
}

/** 编辑器对话框右上角的放大/缩小开关，与发布帖子对话框保持一致。 */
export function EditorExpandToggle({
  expanded,
  onToggle,
}: EditorExpandToggleProps) {
  return (
    <CloseButton
      className="absolute end-12 top-4"
      aria-label={expanded ? '退出全屏' : '高级编辑'}
      onPress={onToggle}
    >
      {expanded ? (
        <Minimize2 className="size-3.5" />
      ) : (
        <Maximize2 className="size-3.5" />
      )}
    </CloseButton>
  )
}