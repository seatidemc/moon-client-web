import { API_BASE } from '@/lib/constants'
import type { UploadKind, UploadResult } from '@/types'

/** HTTP 层错误：保留状态码，供全局 401/403 处理使用。 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

interface ErrorPayload {
  details?: unknown
}

function errorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const details = (payload as ErrorPayload).details
    if (typeof details === 'string' && details.trim()) return details
  }

  return `请求失败（${status}）`
}

/**
 * 统一的 JSON 请求入口。成功响应形如 `{data}`，错误响应形如 `{details}`。
 * 所有请求都携带 HttpOnly session cookie。
 */
export async function request<T>(
  path: string,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  let payload: BodyInit | undefined

  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: payload,
    signal,
  })

  let json: unknown = null
  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    json = await response.json().catch(() => null)
  }

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(json, response.status))
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data
  }

  return json as T
}

export function buildQuery(params: object): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue
        search.append(key, String(item))
      }
      continue
    }
    search.set(key, String(value))
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

/** 上传图片；调用方负责在插入正文前拿到最终 URL。 */
export function uploadImage(
  file: Blob,
  kind: UploadKind,
): Promise<UploadResult> {
  const form = new FormData()
  form.append('kind', kind)
  form.append('file', file)
  return request<UploadResult>('/uploads', { method: 'POST', body: form })
}