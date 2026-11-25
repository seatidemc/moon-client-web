import { Label, Popover, SearchField } from '@heroui/react'
import { ChevronDown } from 'lucide-react'
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type UIEvent,
} from 'react'

import { BoardIcon } from '@/components/BoardIcon'
import { BOARD_ICON_NAMES } from '@/lib/board-icons'

const COLUMNS = 8
/** 与 size-9（36px）和 gap-1（4px）保持一致，用于虚拟滚动定位。 */
const TILE_SIZE = 36
const GAP = 4
const ROW_HEIGHT = TILE_SIZE + GAP
const VIEWPORT_HEIGHT = 256
const OVERSCAN_ROWS = 2

interface BoardIconPickerProps {
  value: string
  onChange: (value: string) => void
}

/** 在弹层中以图标网格选择板块图标，支持按名称搜索。 */
export function BoardIconPicker({ value, onChange }: BoardIconPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeNav, setActiveNav] = useState<{
    query: string
    index: number
  } | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const names = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return BOARD_ICON_NAMES
    return BOARD_ICON_NAMES.filter((name) => name.includes(keyword))
  }, [query])

  const defaultActiveIndex = query
    ? 0
    : Math.max(
        names.findIndex((name) => name === value),
        0,
      )
  const activeIndex =
    activeNav?.query === query ? activeNav.index : defaultActiveIndex

  // 只渲染可视区域上下若干行，避免一次性挂载全部 1000+ 个图标。
  const rowCount = Math.ceil(names.length / COLUMNS)
  const firstRow = Math.max(
    0,
    Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS,
  )
  const lastRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN_ROWS,
  )
  const startIndex = firstRow * COLUMNS
  const endIndex = Math.min(names.length, lastRow * COLUMNS)

  // 打开弹层或搜索条件变化时，滚动到当前图标（搜索时从结果顶部开始）。
  // 只改滚动位置，虚拟列表的起始行由 onScroll 同步。
  useLayoutEffect(() => {
    if (!open) return
    const index = query
      ? 0
      : Math.max(
          names.findIndex((name) => name === value),
          0,
        )
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        Math.floor(index / COLUMNS) * ROW_HEIGHT
    }
  }, [open, query, names, value])

  function select(name: string) {
    onChange(name)
    setQuery('')
    setActiveNav(null)
    setScrollTop(0)
    setOpen(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    setActiveNav(null)
    if (nextOpen) {
      const index = Math.max(
        names.findIndex((name) => name === value),
        0,
      )
      setScrollTop(Math.floor(index / COLUMNS) * ROW_HEIGHT)
    } else {
      setQuery('')
      setScrollTop(0)
    }
  }

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)
    setActiveNav(null)
    setScrollTop(0)
  }

  function optionId(name: string) {
    return `${listboxId}-${name}`
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    setScrollTop(event.currentTarget.scrollTop)
  }

  function moveActive(next: number) {
    const index = Math.max(0, Math.min(next, names.length - 1))
    setActiveNav({ query, index })
    const el = scrollRef.current
    if (!el) return
    const top = Math.floor(index / COLUMNS) * ROW_HEIGHT
    const bottom = top + ROW_HEIGHT
    if (top < el.scrollTop) el.scrollTop = top
    else if (bottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = bottom - el.clientHeight
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        moveActive(activeIndex + 1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        moveActive(activeIndex - 1)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveActive(activeIndex + COLUMNS)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveActive(activeIndex - COLUMNS)
        break
      case 'Home':
        event.preventDefault()
        moveActive(0)
        break
      case 'End':
        event.preventDefault()
        moveActive(names.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (names[activeIndex]) select(names[activeIndex])
        break
      default:
        break
    }
  }

  // 键盘聚焦到网格时，保证当前激活项在视口内。
  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || names.length === 0) return
    const firstVisible = Math.floor(scrollTop / ROW_HEIGHT) * COLUMNS
    if (
      activeIndex < firstVisible ||
      activeIndex >= firstVisible + COLUMNS * VIEWPORT_HEIGHT / ROW_HEIGHT
    ) {
      setActiveNav({
        query,
        index: Math.min(firstVisible, names.length - 1),
      })
    }
  }

  const activeName = names[activeIndex]
  const activeRendered = activeIndex >= startIndex && activeIndex < endIndex

  return (
    <div className="flex flex-col gap-1.5">
      <Label>图标</Label>
      <Popover isOpen={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          className="input flex w-full cursor-pointer items-center justify-between gap-2"
          aria-label={`图标：${value}`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <BoardIcon icon={value} size="18px" />
            <span className="truncate">{value}</span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted"
            aria-hidden="true"
          />
        </Popover.Trigger>

        <Popover.Content className="w-[22rem]">
          <Popover.Dialog>
            <SearchField
              aria-label="搜索图标"
              value={query}
              onChange={handleQueryChange}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="按名称搜索图标" />
                <SearchField.ClearButton aria-label="清空搜索" />
              </SearchField.Group>
            </SearchField>

            <div
              ref={scrollRef}
              role="listbox"
              aria-label="图标"
              aria-activedescendant={
                activeRendered && activeName ? optionId(activeName) : undefined
              }
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onScroll={handleScroll}
              className="group mt-2 max-h-64 overflow-y-auto rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <div
                className="relative"
                style={{ height: Math.max(rowCount * ROW_HEIGHT - GAP, 0) }}
              >
                <div
                  className="absolute inset-x-0 grid"
                  style={{
                    top: firstRow * ROW_HEIGHT,
                    gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
                    gap: `${GAP}px`,
                  }}
                >
                  {names.slice(startIndex, endIndex).map((name, offset) => {
                    const index = startIndex + offset
                    const selected = name === value
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        id={optionId(name)}
                        aria-selected={selected}
                        tabIndex={-1}
                        data-index={index}
                        data-selected={selected || undefined}
                        title={name}
                        onClick={() => select(name)}
                        className={[
                          'grid size-9 cursor-pointer place-items-center rounded-md outline-none hover:bg-surface-secondary data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent data-[selected=true]:hover:bg-accent-soft',
                          index === activeIndex
                            ? 'group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-focus'
                            : '',
                        ].join(' ')}
                      >
                        <BoardIcon icon={name} size="20px" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {names.length === 0 ? (
              <p className="mt-3 text-center text-sm text-muted">
                没有匹配的图标
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                {names.length} 个图标 · 当前 {value}
              </p>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  )
}