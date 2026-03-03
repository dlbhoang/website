import { useState } from 'react'
import type { Device } from '../lib/api'

export type DeviceFormMode = 'create' | 'edit'

type Props = {
  open: boolean
  mode: DeviceFormMode
  device: Device | null
  isSubmitting: boolean
  submitError: string | null
  onClose: () => void
  onSubmit: (values: { deviceId: string; apiKey: string; status: string }) => Promise<void> | void
}

const STATUS_OPTIONS = ['ActivatedMapRoute', 'ActivatedOnlyMap', 'NotActivated'] as const

export function DeviceFormDialog({
  open,
  mode,
  device,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: Props) {
  const title = mode === 'create' ? 'Thêm thiết bị' : 'Cập nhật status'

  const [deviceId, setDeviceId] = useState(() => device?.DeviceID ?? '')
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState(() => device?.Status ?? 'ActivatedMapRoute')
  const [localError, setLocalError] = useState<string | null>(null)

  if (!open) return null

  const canSubmit =
    mode === 'create'
      ? deviceId.trim().length > 0 && apiKey.trim().length > 0 && status.trim().length > 0
      : status.trim().length > 0

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="btn btn--ghost" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </button>
        </div>

        <form
          className="modal__body"
          onSubmit={async (e) => {
            e.preventDefault()
            setLocalError(null)

            if (!canSubmit) {
              setLocalError('Vui lòng nhập đủ thông tin.')
              return
            }

            await onSubmit({ deviceId: deviceId.trim(), apiKey: apiKey.trim(), status })
          }}
        >
          {mode === 'create' ? (
            <>
              <label className="field">
                <div className="field__label">DeviceID</div>
                <input
                  className="input"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="DEVICE_001"
                  autoFocus
                />
              </label>

              <label className="field">
                <div className="field__label">apiKey</div>
                <input
                  className="input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="mysecretkey123"
                />
              </label>
            </>
          ) : (
            <div className="callout">
              Đang sửa thiết bị <span className="mono">{device?.DeviceID}</span> (id{' '}
              <span className="mono">{device?.id}</span>)
            </div>
          )}

          <label className="field">
            <div className="field__label">Status</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {localError ? <div className="error">{localError}</div> : null}
          {submitError ? <div className="error">{submitError}</div> : null}

          <div className="modal__footer">
            <button className="btn btn--ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button className="btn btn--primary" type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

