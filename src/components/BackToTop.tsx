import { Button } from '@heroui/react'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { scrollToTop } from '@/lib/scroll'
import { useCurrentBoardColor } from '@/lib/use-current-board-color'

/** 页面滚动超过这个距离后显示悬浮按钮，避免在页首附近遮挡内容。 */
const SHOW_AFTER = 600

/** 桌面端右下角的悬浮主按钮：滚动一段距离后出现，点击平滑回到页面顶部。 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const boardColor = useCurrentBoardColor()

  useEffect(() => {
    let frame = 0

    function update() {
      frame = 0
      setVisible(window.scrollY > SHOW_AFTER)
    }

    function handleScroll() {
      if (frame === 0) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div
      aria-hidden={visible ? undefined : true}
      className={`fixed right-8 bottom-8 z-30 hidden transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none lg:block ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <Button
        isIconOnly
        size="lg"
        variant="primary"
        aria-label="回到顶部"
        excludeFromTabOrder={!visible}
        className="size-12 rounded-full shadow-lg transition-[filter] hover:brightness-95 active:brightness-90"
        style={boardColor ? { backgroundColor: boardColor } : undefined}
        onPress={scrollToTop}
      >
        <ArrowUp className="size-6" aria-hidden="true" />
      </Button>
    </div>
  )
}