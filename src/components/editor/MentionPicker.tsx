import { ListBox, Surface } from '@heroui/react'
import { useRef, type RefObject } from 'react'

import { UserAvatar } from '@/components/UserAvatar'
import type { User } from '@/types'

import type { MentionTrigger } from './editor-types'
import { useScrollActiveOption } from './use-scroll-active-option'

interface MentionPickerProps {
  panelRef: RefObject<HTMLDivElement | null>
  trigger: MentionTrigger
  options: User[]
  activeIndex: number
  onChoose: (user: User) => void
  onHover: (index: number) => void
}

export function MentionPicker({
  panelRef,
  trigger,
  options,
  activeIndex,
  onChoose,
  onHover,
}: MentionPickerProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  useScrollActiveOption(listRef, activeIndex, options)

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
        提及用户
        {trigger.query ? ` · @${trigger.query}` : ''}
      </p>

      <div ref={listRef} className="max-h-56 overflow-y-auto">
        <ListBox
          aria-label="选择要提及的用户"
          selectionMode="single"
          selectedKeys={
            options[activeIndex] ? [options[activeIndex].id] : []
          }
          renderEmptyState={() => (
            <p className="px-2 py-2 text-sm text-muted">没有匹配的用户。</p>
          )}
          className="pb-1"
        >
          {options.map((user, index) => (
            <ListBox.Item
              key={user.id}
              id={user.id}
              textValue={`${user.name} @${user.handle}`}
              onPress={() => onChoose(user)}
              onHoverStart={() => onHover(index)}
              className="rounded-lg aria-selected:bg-default"
            >
              <UserAvatar user={user} className="size-7" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{user.name}</span>
                <span className="block truncate text-xs text-muted">
                  @{user.handle}
                </span>
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </div>
    </Surface>
  )
}