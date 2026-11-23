import { mediaUrl } from '@/lib/media'
import type { AvatarShape, UserSummary } from '@/types'

export function isAvatarShape(value: unknown): value is AvatarShape {
  return value === 'circle' || value === 'square'
}

/**
 * 头像地址由后端提供：自定义头像或默认头像模板（按 username 生成）。
 * `avatarUrl` 为空时说明数据尚未加载，返回空字符串让浏览器显示占位。
 */
export function getAvatarUrl(user: Pick<UserSummary, 'avatarUrl'>): string {
  return mediaUrl(user.avatarUrl || '')
}

/** 用户自己的头像形状，未设置时按圆形处理。 */
export function getAvatarShape(user: Pick<UserSummary, 'avatarShape'>): AvatarShape {
  return isAvatarShape(user.avatarShape) ? user.avatarShape : 'circle'
}

/**
 * 后端始终返回头像 URL（自定义或默认模板）。默认模板来自 Minotar 时，
 * 用前缀判断当前是否使用了自定义头像，以便决定是否展示“删除头像”。
 */
export function hasCustomAvatar(
  user: Pick<UserSummary, 'avatarUrl'>,
): boolean {
  const url = user.avatarUrl
  return Boolean(url) && !url.startsWith('https://minotar.net/helm/')
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