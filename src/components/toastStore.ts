import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type Toast = {
  id: string
  type: ToastType
  message: string
}

export type ToastContextValue = {
  push: (toast: { type: ToastType; message: string }) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function createToastId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

