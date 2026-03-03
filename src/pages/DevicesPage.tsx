import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDevice, deleteDevice, listDevices, updateDevice } from '../lib/api'
import { ExcelPasteImportDialog } from '../components/ExcelPasteImportDialog'
import type { ImportRow } from '../components/ExcelPasteImportDialog'
import { useToast } from '../components/useToast'

export function DevicesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'ActivatedMapRoute' | 'ActivatedOnlyMap' | 'NotActivated'
  >('all')
  const [newDeviceId, setNewDeviceId] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [newStatus, setNewStatus] = useState('ActivatedMapRoute')
  const [editStatuses, setEditStatuses] = useState<Record<number, string>>({})
  const [importOpen, setImportOpen] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isSavingAll, setIsSavingAll] = useState(false)

  function statusClass(status: string) {
    if (status === 'ActivatedMapRoute') return 'status status--green'
    if (status === 'ActivatedOnlyMap') return 'status status--blue'
    if (status === 'NotActivated') return 'status status--gray'
    return 'status'
  }

  const devicesQuery = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
  })

  const createMutation = useMutation({
    mutationFn: createDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  const filtered = useMemo(() => {
    const list = devicesQuery.data ?? []
    const q = filter.trim().toLowerCase()
    return list.filter((d) => {
      if (statusFilter !== 'all' && d.Status !== statusFilter) return false
      if (!q) return true
      return (
        d.DeviceID.toLowerCase().includes(q) ||
        d.Status.toLowerCase().includes(q) ||
        String(d.id).includes(q)
      )
    })
  }, [devicesQuery.data, filter, statusFilter])

  const stats = useMemo(() => {
    const list = devicesQuery.data ?? []
    const total = list.length
    const byStatus = list.reduce<Record<string, number>>((acc, d) => {
      acc[d.Status] = (acc[d.Status] ?? 0) + 1
      return acc
    }, {})
    return {
      total,
      activatedMapRoute: byStatus.ActivatedMapRoute ?? 0,
      activatedOnlyMap: byStatus.ActivatedOnlyMap ?? 0,
      notActivated: byStatus.NotActivated ?? 0,
    }
  }, [devicesQuery.data])

  const dirtyCount = useMemo(() => {
    const original = devicesQuery.data ?? []
    let dirty = 0
    if (newDeviceId.trim() || newApiKey.trim()) dirty += 1
    for (const d of original) {
      const next = editStatuses[d.id]
      if (next && next !== d.Status) dirty += 1
    }
    return dirty
  }, [devicesQuery.data, editStatuses, newApiKey, newDeviceId])

  const handleSaveAll = useCallback(async () => {
    const trimmedDeviceId = newDeviceId.trim()
    const trimmedApiKey = newApiKey.trim()
    const original = devicesQuery.data ?? []

    const tasks: Promise<unknown>[] = []

    if (trimmedDeviceId && trimmedApiKey) {
      tasks.push(
        createMutation
          .mutateAsync({
            deviceId: trimmedDeviceId,
            apiKey: trimmedApiKey,
            status: newStatus,
          })
          .then(() => {
            setNewDeviceId('')
            setNewApiKey('')
            setNewStatus('ActivatedMapRoute')
          }),
      )
    }

    for (const d of original) {
      const nextStatus = editStatuses[d.id]
      if (nextStatus && nextStatus !== d.Status) {
        tasks.push(
          updateMutation.mutateAsync({ id: d.id, status: nextStatus }).then(() => {
            setEditStatuses((prev) => {
              const clone = { ...prev }
              delete clone[d.id]
              return clone
            })
          }),
        )
      }
    }

    if (tasks.length === 0) return

    try {
      setIsSavingAll(true)
      await Promise.all(tasks)
      await queryClient.invalidateQueries({ queryKey: ['devices'] })
      toast.push({ type: 'success', message: 'Đã lưu thay đổi.' })
    } catch (e) {
      toast.push({ type: 'error', message: `Lỗi khi lưu: ${(e as Error).message}` })
    } finally {
      setIsSavingAll(false)
    }
  }, [
    devicesQuery.data,
    editStatuses,
    createMutation,
    updateMutation,
    newApiKey,
    newDeviceId,
    newStatus,
    queryClient,
    toast,
  ])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const isSaveCombo = (isMac && e.metaKey && e.key === 's') || (!isMac && e.ctrlKey && e.key === 's')
      if (!isSaveCombo) return
      e.preventDefault()
      if (isSavingAll) return
      void handleSaveAll()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSaveAll, isSavingAll])

  return (
    <section className="page">
      <div className="pageHeader">
        <div className="pageHeader__title">
          <h1 className="h1">Thiết bị</h1>
          <div className="muted">
            {devicesQuery.dataUpdatedAt ? (
              <>
                Cập nhật:{' '}
                <span className="mono">{new Date(devicesQuery.dataUpdatedAt).toLocaleTimeString()}</span>
              </>
            ) : (
              'Danh sách thiết bị từ API.'
            )}
          </div>
        </div>

        <div className="pageHeader__actions">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => void devicesQuery.refetch()}
            disabled={devicesQuery.isFetching}
          >
            {devicesQuery.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button className="btn btn--ghost" onClick={() => setImportOpen(true)} type="button">
            Nhập Excel (Ctrl+V)
          </button>
          <button
            className="btn btn--primary"
            type="button"
            disabled={isSavingAll || dirtyCount === 0}
            onClick={() => void handleSaveAll()}
          >
            {isSavingAll ? 'Đang lưu...' : `Lưu (Ctrl+S)${dirtyCount ? ` · ${dirtyCount}` : ''}`}
          </button>
        </div>
      </div>

      <div className="statGrid">
        <button
          type="button"
          className={statusFilter === 'all' ? 'statCard statCard--active' : 'statCard'}
          onClick={() => setStatusFilter('all')}
        >
          <div className="statCard__label">Tổng</div>
          <div className="statCard__value">{stats.total}</div>
        </button>
        <button
          type="button"
          className={statusFilter === 'ActivatedMapRoute' ? 'statCard statCard--active' : 'statCard'}
          onClick={() => setStatusFilter('ActivatedMapRoute')}
        >
          <div className="statCard__label">ActivatedMapRoute</div>
          <div className="statCard__value">{stats.activatedMapRoute}</div>
        </button>
        <button
          type="button"
          className={statusFilter === 'ActivatedOnlyMap' ? 'statCard statCard--active' : 'statCard'}
          onClick={() => setStatusFilter('ActivatedOnlyMap')}
        >
          <div className="statCard__label">ActivatedOnlyMap</div>
          <div className="statCard__value">{stats.activatedOnlyMap}</div>
        </button>
        <button
          type="button"
          className={statusFilter === 'NotActivated' ? 'statCard statCard--active' : 'statCard'}
          onClick={() => setStatusFilter('NotActivated')}
        >
          <div className="statCard__label">NotActivated</div>
          <div className="statCard__value">{stats.notActivated}</div>
        </button>
      </div>

      <div className="card card--padSm">
        <div className="toolbar">
          <input
            className="input toolbar__search"
            placeholder="Tìm theo ID / DeviceID / Status..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="toolbar__chips" role="tablist" aria-label="Status filter">
            <button
              type="button"
              className={statusFilter === 'all' ? 'chip chip--active' : 'chip'}
              onClick={() => setStatusFilter('all')}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={statusFilter === 'ActivatedMapRoute' ? 'chip chip--active' : 'chip'}
              onClick={() => setStatusFilter('ActivatedMapRoute')}
            >
              MapRoute
            </button>
            <button
              type="button"
              className={statusFilter === 'ActivatedOnlyMap' ? 'chip chip--active' : 'chip'}
              onClick={() => setStatusFilter('ActivatedOnlyMap')}
            >
              OnlyMap
            </button>
            <button
              type="button"
              className={statusFilter === 'NotActivated' ? 'chip chip--active' : 'chip'}
              onClick={() => setStatusFilter('NotActivated')}
            >
              NotActivated
            </button>
          </div>
          <div className="toolbar__meta">
            {dirtyCount ? (
              <span className="pill pill--warn">Chưa lưu: {dirtyCount}</span>
            ) : (
              <span className="pill">Đã lưu</span>
            )}
          </div>
        </div>

        {devicesQuery.isLoading ? (
          <div className="empty">Đang tải...</div>
        ) : devicesQuery.isError ? (
          <div className="empty empty--error">
            Lỗi tải dữ liệu: {(devicesQuery.error as Error).message}
          </div>
        ) : (
          <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>DeviceID</th>
                <th>Status</th>
                <th>Created</th>
                <th className="thActions">Thao tác</th>
              </tr>
              <tr>
                <td className="mono" />
                <td />
                <td>
                  <input
                    className="input"
                    placeholder="DEVICE_001"
                    value={newDeviceId}
                    onChange={(e) => setNewDeviceId(e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className={`input ${statusClass(newStatus)}`}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="ActivatedMapRoute">ActivatedMapRoute</option>
                    <option value="ActivatedOnlyMap">ActivatedOnlyMap</option>
                    <option value="NotActivated">NotActivated</option>
                  </select>
                </td>
                <td>
                  <input
                    className="input"
                    placeholder="apiKey (mysecretkey123)"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                </td>
                <td className="actions">
                  <button
                    className="btn btn--primary"
                    disabled={
                      !newDeviceId.trim() ||
                      !newApiKey.trim() ||
                      createMutation.isPending
                    }
                    onClick={() => {
                      if (!newDeviceId.trim() || !newApiKey.trim()) return
                      createMutation.mutate(
                        {
                          deviceId: newDeviceId.trim(),
                          apiKey: newApiKey.trim(),
                          status: newStatus,
                        },
                        {
                          onSuccess: () => {
                            setNewDeviceId('')
                            setNewApiKey('')
                            setNewStatus('ActivatedMapRoute')
                            toast.push({ type: 'success', message: 'Đã thêm thiết bị.' })
                          },
                          onError: (e) => {
                            toast.push({ type: 'error', message: (e as Error).message })
                          },
                        },
                      )
                    }}
                  >
                    Thêm
                  </button>
                </td>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, index) => {
                const currentStatus = editStatuses[d.id] ?? d.Status
                return (
                  <tr key={d.id}>
                    <td className="mono">{index + 1}</td>
                    <td>{d.id}</td>
                    <td className="mono">{d.DeviceID}</td>
                    <td>
                      <select
                        className={`input ${statusClass(currentStatus)}`}
                        value={currentStatus}
                        onChange={(e) =>
                          setEditStatuses((prev) => ({
                            ...prev,
                            [d.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="ActivatedMapRoute">ActivatedMapRoute</option>
                        <option value="ActivatedOnlyMap">ActivatedOnlyMap</option>
                        <option value="NotActivated">NotActivated</option>
                      </select>
                    </td>
                    <td className="mono">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn--primary"
                        disabled={
                          updateMutation.isPending ||
                          (editStatuses[d.id] ?? d.Status) === d.Status
                        }
                        onClick={() => {
                          const status = editStatuses[d.id] ?? d.Status
                          updateMutation.mutate(
                            { id: d.id, status },
                            {
                              onSuccess: () => {
                                setEditStatuses((prev) => {
                                  const clone = { ...prev }
                                  delete clone[d.id]
                                  return clone
                                })
                                toast.push({ type: 'success', message: `Đã lưu #${d.id}` })
                              },
                              onError: (e) => {
                                toast.push({ type: 'error', message: (e as Error).message })
                              },
                            },
                          )
                        }}
                      >
                        Lưu
                      </button>
                      <button
                        className="btn btn--danger"
                        onClick={() => {
                          if (!confirm(`Xóa thiết bị #${d.id} (${d.DeviceID})?`)) return
                          deleteMutation.mutate(d.id, {
                            onSuccess: () => toast.push({ type: 'success', message: `Đã xóa #${d.id}` }),
                            onError: (e) => toast.push({ type: 'error', message: (e as Error).message }),
                          })
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      Không có dữ liệu phù hợp bộ lọc hiện tại.
                      <div className="muted mt6">
                        Thử đổi status filter hoặc xóa nội dung tìm kiếm.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <ExcelPasteImportDialog
        open={importOpen}
        defaultStatus={newStatus}
        isImporting={importProgress !== null}
        importError={importError}
        importProgress={importProgress}
        onClose={() => {
          if (importProgress) return
          setImportOpen(false)
          setImportError(null)
          setImportProgress(null)
        }}
        onImport={async (rows: ImportRow[]) => {
          setImportError(null)
          setImportProgress({ done: 0, total: rows.length })
          try {
            for (let i = 0; i < rows.length; i++) {
              setImportProgress({ done: i, total: rows.length })
              await createMutation.mutateAsync({
                deviceId: rows[i].deviceId,
                apiKey: rows[i].apiKey,
                status: rows[i].status,
              })
            }
            setImportProgress({ done: rows.length, total: rows.length })
            setImportOpen(false)
            setImportProgress(null)
            await queryClient.invalidateQueries({ queryKey: ['devices'] })
            toast.push({ type: 'success', message: `Đã import ${rows.length} dòng.` })
          } catch (e) {
            setImportError((e as Error).message)
            setImportProgress(null)
            toast.push({ type: 'error', message: `Import lỗi: ${(e as Error).message}` })
          }
        }}
      />
    </section>
  )
}

