import { Button, Spinner, type ButtonProps } from '@heroui/react'
import type { ReactNode } from 'react'

interface PendingButtonProps extends Omit<ButtonProps, 'children'> {
  children?: ReactNode
  /** 异步操作进行中：显示 Spinner 并屏蔽交互 */
  isPending?: boolean
}

/** 长耗时操作的按钮：等待后端返回期间显示 HeroUI Spinner，文案保持不变。 */
export function PendingButton({
  isPending = false,
  isDisabled,
  children,
  ...props
}: PendingButtonProps) {
  return (
    <Button {...props} isDisabled={isDisabled} isPending={isPending}>
      {isPending ? (
        <Spinner size="sm" color="current" aria-hidden="true" />
      ) : null}
      {children}
    </Button>
  )
}