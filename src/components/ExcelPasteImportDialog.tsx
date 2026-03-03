import { useMemo, useState } from 'react'

export type ImportRow = {
  deviceId: string
  apiKey: string
  status: string
}

function normalizeHeader(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function splitRow(line: string) {
  // Excel paste is typically TSV. Fall back to comma/semicolon.
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  return line.split(',')
}

function parsePaste(text: string, defaultStatus: string): { rows: ImportRow[]; errors: string[] } {
  const rawLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)

  if (rawLines.length === 0) return { rows: [], errors: [] }

  const firstCells = splitRow(rawLines[0]).map((c) => c.trim())
  const headers = firstCells.map(normalizeHeader)
  const hasHeader =
    headers.includes('deviceid') || headers.includes('device') || headers.includes('apikey') || headers.includes('status')

  let startIndex = 0
  let map: { deviceId: number; apiKey: number; status: number } = { deviceId: 0, apiKey: 1, status: 2 }

  if (hasHeader) {
    startIndex = 1
    const find = (candidates: string[]) => headers.findIndex((h) => candidates.includes(h))
    const deviceIdx = find(['deviceid', 'device'])
    const apiKeyIdx = find(['apikey', 'api_key', 'key'])
    const statusIdx = find(['status'])
    map = {
      deviceId: deviceIdx >= 0 ? deviceIdx : 0,
      apiKey: apiKeyIdx >= 0 ? apiKeyIdx : 1,
      status: statusIdx >= 0 ? statusIdx : 2,
    }
  }

  const rows: ImportRow[] = []
  const errors: string[] = []

  for (let i = startIndex; i < rawLines.length; i++) {
    const cells = splitRow(rawLines[i]).map((c) => c.trim())
    const deviceId = cells[map.deviceId]?.trim() ?? ''
    const apiKey = cells[map.apiKey]?.trim() ?? ''
    const status = (cells[map.status]?.trim() || defaultStatus).trim()

    if (!deviceId) {
      errors.push(`Dòng ${i + 1}: thiếu DeviceID`)
      continue
    }
    if (!apiKey) {
      errors.push(`Dòng ${i + 1}: thiếu apiKey`)
      continue
    }
    rows.push({ deviceId, apiKey, status })
  }

  return { rows, errors }
}

type Props = {
  open: boolean
  defaultStatus: string
  isImporting: boolean
  importError: string | null
  importProgress: { done: number; total: number } | null
  onClose: () => void
  onImport: (rows: ImportRow[]) => Promise<void> | void
}

export function ExcelPasteImportDialog({
  open,
  defaultStatus,
  isImporting,
  importError,
  importProgress,
  onClose,
  onImport,
}: Props) {
  const [text, setText] = useState('')
  const parsed = useMemo(() => parsePaste(text, defaultStatus), [text, defaultStatus])

  if (!open) return null

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-label="Nhập từ Excel">
        <div className="modal__header">
          <div className="modal__title">Nhập từ Excel (copy → paste)</div>
          <button className="btn btn--ghost" onClick={onClose} disabled={isImporting}>
            Đóng
          </button>
        </div>

        <div className="modal__body">
          <div className="muted">
            Gợi ý: Excel thường paste dạng <span className="mono">TSV</span>. Bạn có thể paste 3 cột:
            <span className="mono"> DeviceID</span> — <span className="mono">apiKey</span> —{' '}
            <span className="mono">Status</span>. Nếu thiếu Status sẽ dùng mặc định{' '}
            <span className="mono">{defaultStatus}</span>.
          </div>

          <label className="field">
            <div className="field__label">Dữ liệu (Ctrl+V)</div>
            <textarea
              className="textarea"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`DEVICE_001\tmysecretkey123\tActivatedMapRoute\nDEVICE_002\tmysecretkey123\tNotActivated`}
            />
          </label>

          {parsed.errors.length > 0 ? (
            <div className="error">
              {parsed.errors.slice(0, 6).map((e) => (
                <div key={e}>{e}</div>
              ))}
              {parsed.errors.length > 6 ? <div>... và {parsed.errors.length - 6} lỗi khác</div> : null}
            </div>
          ) : null}

          <div className="callout">
            Preview: <b>{parsed.rows.length}</b> dòng hợp lệ
            {importProgress ? (
              <>
                {' '}
                — Đang import: <span className="mono">{importProgress.done}</span>/
                <span className="mono">{importProgress.total}</span>
              </>
            ) : null}
          </div>

          {importError ? <div className="error">Lỗi import: {importError}</div> : null}

          <div className="modal__footer">
            <button className="btn btn--ghost" onClick={() => setText('')} disabled={isImporting}>
              Xóa dữ liệu
            </button>
            <button
              className="btn btn--primary"
              disabled={parsed.rows.length === 0 || parsed.errors.length > 0 || isImporting}
              onClick={() => onImport(parsed.rows)}
            >
              {isImporting ? 'Đang import...' : `Import ${parsed.rows.length} dòng`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

