import { Avatar, cn } from '@heroui/react'

import {
  getAvatarShape,
  getAvatarShapeClassName,
  getAvatarUrl,
} from '@/lib/avatar'
import { getDisplayName } from '@/lib/user'
import type { UserSummary } from '@/types'

interface UserAvatarProps {
  user: UserSummary
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ user, size = 'sm', className }: UserAvatarProps) {
  return (
    <Avatar
      size={size}
      variant="soft"
      aria-label={getDisplayName(user)}
      className={cn(
        'shrink-0',
        getAvatarShapeClassName(getAvatarShape(user)),
        className,
      )}
    >
      <Avatar.Image src={getAvatarUrl(user)} alt={getDisplayName(user)} />
    </Avatar>
  )
}