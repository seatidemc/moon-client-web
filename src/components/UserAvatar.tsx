import { Avatar, cn } from '@heroui/react'

import { getAvatarUrl } from '@/lib/avatar'
import type { User } from '@/types'

interface UserAvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ user, size = 'sm', className }: UserAvatarProps) {
  return (
    <Avatar
      size={size}
      variant="soft"
      aria-label={user.name}
      className={cn('shrink-0 rounded-full', className)}
    >
      <Avatar.Image src={getAvatarUrl(user)} alt={user.name} />
      <Avatar.Fallback>{user.name.slice(0, 1)}</Avatar.Fallback>
    </Avatar>
  )
}
