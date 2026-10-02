export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = await response.json().catch(() => ({ message: '서버 응답을 읽지 못했습니다.' }))
  if (!response.ok)
    throw new ApiError(data.message ?? '요청을 처리하지 못했습니다.', response.status)
  return data as T
}
export function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* 저장 공간이 없으면 현재 세션에서 작업을 유지합니다. */
  }
}
