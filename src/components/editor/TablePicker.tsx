import { Surface, cn } from '@heroui/react'
import { useState, type RefObject } from 'react'

import {
  TABLE_GRID_COLUMNS,
  TABLE_GRID_ROWS,
  TABLE_PICKER_WIDTH,
} from './editor-constants'
import type { TablePanelPosition } from './editor-types'

interface TablePickerProps {
  panelRef: RefObject<HTMLDivElement | null>
  position: TablePanelPosition
  onInsert: (rows: number, cols: number) => void
}

const DEFAULT_HOVER = { rows: 3, cols: 3 }

export function TablePicker({
  panelRef,
  position,
  onInsert,
}: TablePickerProps) {
  const [hover, setHover] = useState(DEFAULT_HOVER)

  return (
    <Surface
      ref={panelRef}
      className="absolute z-30 rounded-xl border border-field-border p-2 shadow-lg"
      style={{ left: position.left, top: position.top, width: TABLE_PICKER_WIDTH }}
    >
      <p className="px-1 pb-2 text-xs text-muted">
        插入表格 · {hover.rows} 行 × {hover.cols} 列
      </p>

      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${TABLE_GRID_COLUMNS}, minmax(0, 1fr))`,
        }}
        onMouseLeave={() => setHover(DEFAULT_HOVER)}
      >
        {Array.from(
          { length: TABLE_GRID_ROWS * TABLE_GRID_COLUMNS },
          (_, index) => {
            const row = Math.floor(index / TABLE_GRID_COLUMNS) + 1
            const col = (index % TABLE_GRID_COLUMNS) + 1
            const active = row <= hover.rows && col <= hover.cols

            return (
              <button
                key={index}
                type="button"
                aria-label={`${row} 行 ${col} 列`}
                className={cn(
                  'size-5 rounded-[4px] border transition-colors',
                  active
                    ? 'border-foreground/40 bg-default'
                    : 'border-field-border bg-transparent hover:bg-default-soft',
                )}
                onFocus={() => setHover({ rows: row, cols: col })}
                onMouseEnter={() => setHover({ rows: row, cols: col })}
                onClick={() => onInsert(row, col)}
              />
            )
          },
        )}
      </div>
    </Surface>
  )
}