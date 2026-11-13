import { useEffect, useState } from 'react'

import { scrollToAndEmphasize } from '@/lib/scroll'
import { formatRelativeTime } from '@/lib/utils'

export interface ThreadTocItem {
  id: string
  label: string
  /** ISO 时间，展示为相对时间 */
  time?: string
}

const ACTIVE_OFFSET = 96

export function ThreadToc({ items }: { items: ThreadTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  const itemsKey = items.map((item) => item.id).join('\n')

  useEffect(() => {
    const ids = itemsKey === '' ? [] : itemsKey.split('\n')
    if (ids.length === 0) return

    let frame = 0

    function update() {
      frame = 0

      const elements = ids
        .map((id) => document.getElementById(id))
        .filter((element): element is HTMLElement => element !== null)

      if (elements.length === 0) return

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8

      if (atBottom) {
        setActiveId(ids[ids.length - 1])
        return
      }

      let current = ids[0]
      for (const element of elements) {
        if (element.getBoundingClientRect().top <= ACTIVE_OFFSET) {
          current = element.id
        }
      }

      setActiveId(current)
    }

    function handleScroll() {
      if (frame === 0) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [itemsKey])

  if (items.length === 0) return null

  return (
    <nav
      aria-label="楼层导航"
      className="hidden lg:block"
    >
      <ul className="flex flex-col items-start">
        {items.map((item) => {
          const isActive = item.id === activeId

          return (
            <li key={item.id} className="w-full">
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'location' : undefined}
                className="group flex w-full items-center gap-2 rounded py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40"
                onClick={(event) => {
                  event.preventDefault()
                  scrollToAndEmphasize(item.id)
                }}
              >
                <span
                  aria-hidden="true"
                  className={`h-0.5 shrink-0 rounded-full transition-all duration-200 ease-out ${
                    isActive
                      ? 'w-10 bg-accent/70'
                      : 'w-3 bg-accent/20 group-hover:w-5 group-hover:bg-accent/40'
                  }`}
                />
                <span
                  className={`min-w-0 truncate text-xs transition-[max-width,opacity,color] duration-200 ease-out group-hover:max-w-60 group-hover:opacity-100 group-hover:text-foreground group-focus-visible:max-w-60 group-focus-visible:opacity-100 ${
                    isActive
                      ? 'max-w-60 text-foreground opacity-100'
                      : 'max-w-0 text-muted opacity-0'
                  }`}
                >
                  {item.label}
                  {item.time ? ` · ${formatRelativeTime(item.time)}` : null}
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}