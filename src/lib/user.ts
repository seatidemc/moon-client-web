import type { UserSummary } from '@/types'

type UserNameSource = Pick<UserSummary, 'nickname' | 'username'>

/** 展示名：设置了昵称用昵称，否则回退到不可变的 username。 */
export function getDisplayName(user: UserNameSource): string {
  const nickname = user.nickname?.trim()
  return nickname ? nickname : user.username
}

/** @ 标识始终使用 username。 */
export function getUsername(user: Pick<UserSummary, 'username'>): string {
  return user.username
}