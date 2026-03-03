import { useCallback, useMemo, useRef, useState } from 'react'
import { createToastId, ToastContext, type Toast, type ToastType } from './toastStore'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    ({ type, message }: { type: ToastType; message: string }) => {
      const id = createToastId()
      setToasts((prev) => [{ id, type, message }, ...prev].slice(0, 4))
      const timeout = window.setTimeout(() => remove(id), 3500)
      timers.current.set(id, timeout)
    },
    [remove],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toastViewport" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <div className="toast__msg">{t.message}</div>
            <button className="toast__close" onClick={() => remove(t.id)} aria-label="Close">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

