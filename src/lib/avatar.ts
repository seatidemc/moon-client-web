import type { User } from '@/types'

const DEFAULT_AVATAR_SIZE = 200

/**
 * 用户头像图片地址。未设置自定义头像时，按 handle 生成一个固定的真实图片头像，
 * 保证同一个用户在全站（导航栏、帖子列表、用户主页等）始终显示同一张图片。
 */
export function getAvatarUrl(
  user: Pick<User, 'handle' | 'avatarUrl'>,
): string {
  return (
    user.avatarUrl ??
    `https://i.pravatar.cc/${DEFAULT_AVATAR_SIZE}?u=${encodeURIComponent(user.handle)}`
  )
}
