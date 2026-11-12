import {
  Menu,
  MenuItem,
  MenuSection,
  Surface,
  cn,
} from '@heroui/react'
import type { Editor } from '@tiptap/core'
import { useEffect, useRef, type RefObject } from 'react'

import { applyTableAction } from './editor-commands'
import {
  TABLE_ACTIONS,
  TABLE_MENU_GROUPS,
  TABLE_MENU_MAX_HEIGHT,
  TABLE_MENU_WIDTH,
  type TableActionId,
} from './editor-constants'
import type { TablePanelPosition } from './editor-types'

interface TableMenuProps {
  editor: Editor | null
  panelRef: RefObject<HTMLDivElement | null>
  position: TablePanelPosition
  canMergeCells: boolean
  canSplitCell: boolean
  onClose: () => void
}

export function TableMenu({
  editor,
  panelRef,
  position,
  canMergeCells,
  canSplitCell,
  onClose,
}: TableMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // 菜单打开后把焦点交给菜单，支持方向键选择。
  useEffect(() => {
    const frame = requestAnimationFrame(() => listRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <Surface
      ref={panelRef}
      className="fixed z-50 overflow-hidden rounded-xl border border-field-border p-0 shadow-lg"
      style={{
        left: position.left,
        top: position.top,
        width: TABLE_MENU_WIDTH,
        maxHeight: `min(${TABLE_MENU_MAX_HEIGHT}px, calc(100vh - 1rem))`,
      }}
    >
      <Menu
        ref={listRef}
        aria-label="表格操作"
        className="max-h-[inherit] overflow-y-auto p-1"
        shouldCloseOnSelect={false}
        onAction={(key) => {
          if (editor) applyTableAction(editor, key as TableActionId)
          onClose()
        }}
      >
        {TABLE_MENU_GROUPS.map((group, groupIndex) => (
          <MenuSection
            key={group.label}
            aria-label={group.label}
            className={cn(
              groupIndex > 0 && 'mt-1 border-t border-separator pt-1',
            )}
          >
            {group.actions.map((id) => {
              const action = TABLE_ACTIONS.find((item) => item.id === id)
              if (!action) return null

              return (
                <MenuItem
                  key={id}
                  id={id}
                  textValue={action.label}
                  variant={id === 'deleteTable' ? 'danger' : undefined}
                  isDisabled={
                    (id === 'mergeCells' && !canMergeCells) ||
                    (id === 'splitCell' && !canSplitCell)
                  }
                >
                  <span data-slot="label">{action.label}</span>
                </MenuItem>
              )
            })}
          </MenuSection>
        ))}
      </Menu>
    </Surface>
  )
}