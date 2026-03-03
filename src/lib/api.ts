export type Device = {
  id: number
  DeviceID: string
  Status: string
  created_at: string
}

type ApiListResponse<T> = {
  message: string
  data: T
}

const DEFAULT_BASE_URL = 'http://103.77.243.38:3006'
const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  // When deployed on HTTPS (e.g. Vercel), use same-origin proxy to avoid Mixed Content.
  (import.meta.env.PROD ? '/api' : DEFAULT_BASE_URL)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export async function listDevices(): Promise<Device[]> {
  const res = await request<ApiListResponse<Device[]>>('/device')
  return res.data
}

export async function createDevice(input: { deviceId: string; apiKey: string; status: string }) {
  return await request<ApiListResponse<unknown>>('/device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export async function updateDevice(input: { id: number; status: string }) {
  return await request<ApiListResponse<unknown>>(`/device/${input.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: input.status }),
  })
}

export async function deleteDevice(id: number) {
  return await request<ApiListResponse<unknown>>(`/device/${id}`, { method: 'DELETE' })
}

export async function uploadDevicesExcel(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/device/upload`, { method: 'POST', body: form })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as unknown
}

