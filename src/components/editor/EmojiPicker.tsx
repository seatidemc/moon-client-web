import { ListBox, Surface } from '@heroui/react'
import { useRef, type RefObject } from 'react'

import type { EmojiSuggestionItem } from '@/lib/emoji-suggestion'

import type { EmojiSuggestionState } from './editor-types'
import { useScrollActiveOption } from './use-scroll-active-option'

interface EmojiPickerProps {
  panelRef: RefObject<HTMLDivElement | null>
  suggestion: EmojiSuggestionState
  activeIndex: number
  onChoose: (item: EmojiSuggestionItem) => void
  onHover: (index: number) => void
}

export function EmojiPicker({
  panelRef,
  suggestion,
  activeIndex,
  onChoose,
  onHover,
}: EmojiPickerProps) {
  const activeItem = suggestion.items[activeIndex]
  const listRef = useRef<HTMLDivElement | null>(null)
  useScrollActiveOption(listRef, activeIndex, suggestion.items)

  return (
    <Surface
      ref={panelRef}
      className="absolute z-20 w-64 max-w-[calc(100%_-_1rem)] overflow-hidden rounded-xl border border-field-border shadow-lg"
      style={{
        left: suggestion.left,
        top: suggestion.top,
        transform: suggestion.above ? 'translateY(-100%)' : undefined,
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <p className="px-2 pt-1.5 pb-1 text-xs text-muted">
        表情
        {suggestion.query ? ` · :${suggestion.query}` : ''}
      </p>

      <div ref={listRef} className="max-h-56 overflow-y-auto">
        <ListBox
          aria-label="选择表情"
          selectionMode="single"
          selectedKeys={activeItem ? [activeItem.name] : []}
          className="pb-1"
        >
          {suggestion.items.map((item, index) => (
            <ListBox.Item
              key={item.name}
              id={item.name}
              textValue={`:${item.name}:`}
              onPress={() => onChoose(item)}
              onHoverStart={() => onHover(index)}
              className="rounded-lg aria-selected:bg-default"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center text-lg"
                aria-hidden="true"
              >
                {item.emoji}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                :{item.name}:
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </div>
    </Surface>
  )
}