import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { uploadDevicesExcel } from '../lib/api'
import { useToast } from '../components/useToast'

export function UploadPage() {
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<unknown>(null)

  const uploadMutation = useMutation({
    mutationFn: uploadDevicesExcel,
    onSuccess: (data) => {
      setResult(data)
      toast.push({ type: 'success', message: 'Upload thành công.' })
    },
    onError: (e) => toast.push({ type: 'error', message: (e as Error).message }),
  })

  return (
    <section className="card">
      <h1 className="h1">Upload Excel</h1>
      <p className="muted">
        Gửi file Excel lên endpoint <span className="mono">/device/upload</span> (field{' '}
        <span className="mono">file</span>).
      </p>

      <div className="row row--gap">
        <label className="field field--compact">
          <div className="field__label">Chọn file Excel</div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              setResult(null)
            }}
          />
        </label>

        <button
          className="btn btn--primary"
          disabled={!file || uploadMutation.isPending}
          onClick={() => {
            if (!file) return
            uploadMutation.mutate(file)
          }}
        >
          {uploadMutation.isPending ? 'Đang upload...' : 'Upload'}
        </button>
      </div>

      {result ? (
        <div className="code">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </section>
  )
}

