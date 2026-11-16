import type { AvatarShape, User } from '@/types'

const DEFAULT_AVATAR_SIZE = 200

/**
 * 用户头像图片地址。未设置自定义头像时，按 handle 拉取同名 Minecraft 玩家的头像，
 * 保证同一个用户在全站（导航栏、帖子列表、用户主页等）始终显示同一张图片。
 */
export function getAvatarUrl(
  user: Pick<User, 'handle' | 'avatarUrl'>,
): string {
  return (
    user.avatarUrl ??
    `https://minotar.net/helm/${encodeURIComponent(user.handle)}/${DEFAULT_AVATAR_SIZE}.png`
  )
}

/**
 * 头像容器的形状样式：圆形用满圆角；方形用等比小圆角，并稍微缩小，
 * 让两种形状的视觉大小保持一致。
 */
export function getAvatarShapeClassName(shape: AvatarShape): string {
  return shape === 'square'
    ? 'rounded-[10%] scale-[0.92]'
    : 'rounded-full'
}
