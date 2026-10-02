export async function api<T>(url: string): Promise<T> {
  const response = await fetch(`/api${url}`)
  const data = await response.json().catch(() => ({ message: '서버 응답을 읽지 못했습니다.' }))
  if (!response.ok) throw new Error(data.message ?? '문서를 불러오지 못했습니다.')
  return data as T
}

export function readStorage(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 저장 공간이 없으면 현재 시점만 유지합니다. */
  }
}
