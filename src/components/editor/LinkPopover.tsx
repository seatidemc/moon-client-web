import type { Editor } from '@tiptap/core'
import { Button, Input, Surface } from '@heroui/react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react'

import type { LinkPopoverState } from './editor-types'
import { normalizeLinkHref } from './editor-utils'

interface LinkPopoverProps {
  editor: Editor
  state: LinkPopoverState
  panelRef: RefObject<HTMLDivElement | null>
  onClose: () => void
}

export function LinkPopover({
  editor,
  state,
  panelRef,
  onClose,
}: LinkPopoverProps) {
  const [hrefInput, setHrefInput] = useState(state.href)
  const [textInput, setTextInput] = useState(state.text)
  const hrefInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => hrefInputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [])

  function applyLink() {
    const href = normalizeLinkHref(hrefInput)
    if (!href) return

    // 展示文本留空时直接使用链接内容。
    const text = textInput.trim() || href
    const { from, to } = state

    let chain = editor.chain().focus().setTextSelection({ from, to })
    if (state.editing) chain = chain.extendMarkRange('link')

    chain
      .insertContent({
        type: 'text',
        text,
        marks: [{ type: 'link', attrs: { href } }],
      })
      .run()
    onClose()
  }

  function removeLink() {
    const { from, to } = state

    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .extendMarkRange('link')
      .unsetLink()
      .run()
    onClose()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (hrefInput.trim()) applyLink()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <Surface
      ref={panelRef}
      className="absolute z-30 w-80 max-w-[calc(100%_-_1rem)] rounded-xl border border-field-border p-2 shadow-lg"
      style={{
        left: state.left,
        top: state.top,
        transform: state.above ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="px-1 text-xs text-muted">展示文本</span>
          <Input
            fullWidth
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="展示文本"
            placeholder="留空则与链接内容相同"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="px-1 text-xs text-muted">链接内容（必填）</span>
          <Input
            ref={hrefInputRef}
            fullWidth
            value={hrefInput}
            onChange={(event) => setHrefInput(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="链接内容"
            placeholder="https://example.com"
          />
        </label>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate px-1 text-xs text-muted">
          {state.editing ? '编辑链接' : '插入链接'}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {state.editing ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onPress={removeLink}
            >
              移除
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onPress={onClose}>
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            isDisabled={!hrefInput.trim()}
            onPress={applyLink}
          >
            确定
          </Button>
        </div>
      </div>
    </Surface>
  )
}