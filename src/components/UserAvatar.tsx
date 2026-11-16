import { Avatar, cn } from '@heroui/react'

import { getAvatarShapeClassName, getAvatarUrl } from '@/lib/avatar'
import { useForum } from '@/lib/forum-context'
import type { User } from '@/types'

interface UserAvatarProps {
  user: User
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function UserAvatar({ user, size = 'sm', className }: UserAvatarProps) {
  const { avatarShape } = useForum()

  return (
    <Avatar
      size={size}
      variant="soft"
      aria-label={user.name}
      className={cn(
        'shrink-0',
        getAvatarShapeClassName(avatarShape),
        className,
      )}
    >
      <Avatar.Image src={getAvatarUrl(user)} alt={user.name} />
    </Avatar>
  )
}
