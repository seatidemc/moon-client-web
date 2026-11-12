import { ListBox, Surface } from '@heroui/react'
import type { RefObject } from 'react'

import type { ReplyReferenceOption } from '@/lib/reply-reference-options'

import type { ReferenceTrigger } from './editor-types'

interface ReferencePickerProps {
  panelRef: RefObject<HTMLDivElement | null>
  trigger: ReferenceTrigger
  options: ReplyReferenceOption[]
  activeIndex: number
  onChoose: (option: ReplyReferenceOption) => void
  onHover: (index: number) => void
}

export function ReferencePicker({
  panelRef,
  trigger,
  options,
  activeIndex,
  onChoose,
  onHover,
}: ReferencePickerProps) {
  return (
    <Surface
      ref={panelRef}
      className="absolute z-20 w-72 max-w-[calc(100%_-_1rem)] overflow-hidden rounded-xl border border-field-border shadow-lg"
      style={{
        left: trigger.left,
        top: trigger.top,
        transform: trigger.above ? 'translateY(-100%)' : undefined,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <p className="px-2 pt-1.5 pb-1 text-xs text-muted">
        回复楼层
        {trigger.query ? ` · #${trigger.query}` : ''}
      </p>

      <div className="max-h-56 overflow-y-auto">
        <ListBox
          aria-label="选择要回复的楼层"
          selectionMode="single"
          selectedKeys={
            options[activeIndex] ? [String(options[activeIndex].floor)] : []
          }
          renderEmptyState={() => (
            <p className="px-2 py-2 text-sm text-muted">没有匹配的楼层。</p>
          )}
          className="pb-1"
        >
          {options.map((option, index) => (
            <ListBox.Item
              key={option.floor}
              id={String(option.floor)}
              textValue={`#${option.floor} ${option.name}`}
              onPress={() => onChoose(option)}
              onHoverStart={() => onHover(index)}
              className="rounded-lg aria-selected:bg-default"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-default text-xs font-medium tabular-nums">
                #{option.floor}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{option.name}</span>
                <span className="block truncate text-xs text-muted">
                  {option.excerpt || '（无内容）'}
                </span>
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </div>
    </Surface>
  )
}