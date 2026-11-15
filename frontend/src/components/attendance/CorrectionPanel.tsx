import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'
import type { CorrectionDay, CorrectionRequest, Page, User } from '../../lib/api'

const labels: Record<CorrectionDay['status'], string> = {
  NOT_RECORDED: 'Belum tercatat', CORRECTION_PENDING: 'Menunggu peninjauan',
  CORRECTION_APPROVED: 'Tercatat melalui koreksi', CORRECTION_REJECTED: 'Koreksi ditolak', SUBMITTED: 'Sudah absen',
}
const icons: Record<CorrectionDay['status'], string> = { NOT_RECORDED: '!', CORRECTION_PENDING: '…', CORRECTION_APPROVED: '✓', CORRECTION_REJECTED: '×', SUBMITTED: '✓' }
export function CorrectionPanel({ token, user, onChanged }: { token: string; user: User; onChanged: () => Promise<void> }) {
  const [days, setDays] = useState<CorrectionDay[]>([])
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewStatus, setReviewStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const key = useRef(crypto.randomUUID())
  const load = useCallback(async () => {
    if (user.role === 'EMPLOYEE') {
      const [eligible, mine] = await Promise.all([api<CorrectionDay[]>('/attendance-corrections/eligible-days', token), api<Page<CorrectionRequest>>('/attendance-corrections/me?limit=100', token)])
      setDays(eligible); setRequests(mine.data)
    } else if (user.reviewDepartments?.length) {
      const queue = await api<Page<CorrectionRequest>>(`/attendance-corrections/pending?limit=100&status=${reviewStatus}`, token)
      setRequests(queue.data)
    }
  }, [token, user, reviewStatus])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load().catch(e => { if (active) setError(e instanceof Error ? e.message : 'Gagal memuat koreksi.') }) }); return () => { active = false } }, [load])
  useEffect(() => { return () => { if (preview) URL.revokeObjectURL(preview) } }, [preview])
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!selected || !file || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      const body = new FormData(); body.append('workDate', selected); body.append('reason', reason.trim()); body.append('evidence', file)
      const row = await api<CorrectionRequest>('/attendance-corrections', token, { method: 'POST', headers: { 'Idempotency-Key': key.current }, body })
      setNotice(`Permintaan ${row.id} dikirim untuk ditinjau.`); setSelected(null); setReason(''); setFile(null); key.current = crypto.randomUUID(); await load(); await onChanged()
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal mengirim permintaan. Data formulir tersimpan.') }
    finally { setBusy(false) }
  }
  async function decide(row: CorrectionRequest, decision: 'approve' | 'reject') {
    if (busy || !window.confirm(`${decision === 'approve' ? 'Setujui' : 'Tolak'} koreksi ${row.employee.fullName} untuk ${row.workDate}?`)) return
    if (decision === 'reject' && reviewNote.trim().length < 20) { setError('Alasan penolakan minimal 20 karakter.'); return }
    setBusy(true); setError('')
    try {
      await api(`/attendance-corrections/${row.id}/${decision}`, token, { method: 'POST', body: JSON.stringify(decision === 'reject' ? { reason: reviewNote.trim() } : { note: reviewNote.trim() || undefined }) })
      setNotice(decision === 'approve' ? 'Koreksi disetujui.' : 'Koreksi ditolak.'); setReviewNote(''); setSelected(null); await load(); await onChanged()
    } catch (e) { setError(e instanceof Error ? e.message : 'Keputusan gagal.'); await load().catch(() => {}) }
    finally { setBusy(false) }
  }
  async function cancel(id: string) {
    if (!window.confirm('Batalkan permintaan koreksi ini?')) return
    setBusy(true); setError('')
    try { await api(`/attendance-corrections/${id}/cancel`, token, { method: 'POST' }); setNotice('Permintaan dibatalkan.'); await load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal membatalkan.') }
    finally { setBusy(false) }
  }
  async function showEvidence(row: CorrectionRequest) {
    const evidence = row.evidence[0]; if (!evidence) return
    try { const blob = await api<Blob>(`/attendance-corrections/${row.id}/evidence/${evidence.id}`, token); setPreview(URL.createObjectURL(blob)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Bukti tidak dapat dibuka.') }
  }
  if (user.role === 'HRD' && !user.reviewDepartments?.length) return null
  return <section className="mt-[2vw] rounded-xl border border-dexa-border bg-white p-[1.5vw] max-sm:p-[4vw]" aria-label="Koreksi absensi">
    <h2 className="text-lg font-semibold">{user.role === 'EMPLOYEE' ? 'Koreksi absensi terlewat' : 'Kotak tinjau koreksi'}</h2>
    {user.role === 'HRD' && <label className="mt-[1vw] grid max-w-[20vw] gap-1 max-sm:max-w-full">Status permintaan<select value={reviewStatus} onChange={e => setReviewStatus(e.target.value as typeof reviewStatus)} className="rounded-lg border border-dexa-border p-[1vw]"><option value="PENDING">Menunggu</option><option value="APPROVED">Disetujui</option><option value="REJECTED">Ditolak</option></select></label>}
    {error && <p role="alert" className="mt-[1vw] text-dexa-red">{error}</p>}{notice && <p role="status" className="mt-[1vw]">{notice}</p>}
    {user.role === 'EMPLOYEE' && <>
      <p className="mt-[1vw] text-sm">Hanya hari WFH yang sudah diverifikasi ditampilkan. Tanggal tanpa referensi jadwal memerlukan verifikasi; tidak dianggap mangkir.</p>
      <div className="mt-[1vw] grid gap-[1vw]">{days.map(day => <div key={day.workDate} className="flex flex-wrap items-center justify-between gap-[1vw] rounded-lg border border-dexa-border p-[1vw] max-sm:p-[3vw]"><span>{day.workDate} · <span aria-hidden="true">{icons[day.status]}</span> {labels[day.status]}</span><span>{day.reviewNote && `Alasan: ${day.reviewNote}`}</span>{(day.status === 'NOT_RECORDED' || day.status === 'CORRECTION_REJECTED') && <button type="button" className="primary" onClick={() => { setSelected(day.workDate); setError('') }}>Ajukan Koreksi</button>}</div>)}</div>
      {!days.length && <p className="mt-[1vw] text-sm">Perlu verifikasi jadwal: belum ada hari WFH eligible dalam jendela koreksi.</p>}
      {selected && <form onSubmit={e => void submit(e)} className="mt-[1.5vw] grid gap-[1vw] rounded-lg border border-dexa-border p-[1.5vw] max-sm:p-[4vw]"><h3>Ajukan koreksi untuk {selected}</h3><p className="text-sm">Pengajuan ini tidak mengubah waktu absensi asli. Koreksi akan ditinjau oleh petugas berwenang. Bukti ini adalah bukti pendukung retroaktif.</p><label className="grid gap-1">Alasan (20–1000 karakter)<textarea required minLength={20} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="rounded-lg border border-dexa-border p-[1vw]" /></label><label className="grid gap-1">Bukti pendukung (JPEG, PNG, atau WebP; maks. 5 MiB)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><div className="flex gap-[1vw]"><button className="primary" disabled={busy} type="submit">Kirim permintaan</button><button type="button" onClick={() => setSelected(null)}>Batal</button></div></form>}
      <h3 className="mt-[2vw] font-semibold">Riwayat permintaan</h3>
    </>}
    <div className="mt-[1vw] grid gap-[1vw]">{requests.map(row => <article key={row.id} className="rounded-lg border border-dexa-border p-[1vw] max-sm:p-[3vw]"><strong>{row.employee.fullName} · {row.workDate}</strong><p>Status: {row.status} · Referensi {row.id}</p>{row.priorRejectedRequestId && <p>Pengajuan ulang dari permintaan ditolak: {row.priorRejectedRequestId}</p>}<p>Diajukan: {new Date(row.requestedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p><p className="whitespace-pre-wrap">Alasan: {row.reason}</p>{row.reviewedAt && <p>Ditinjau: {new Date(row.reviewedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>}{row.reviewNote && <p>Catatan reviewer: {row.reviewNote}</p>}{row.attendance && <p>Hasil: tercatat melalui koreksi pada {new Date(row.attendance.submittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>}<div className="mt-[1vw] flex flex-wrap gap-[1vw]"><button type="button" onClick={() => void showEvidence(row)}>Lihat bukti pendukung retroaktif</button>{user.role === 'EMPLOYEE' && row.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => void cancel(row.id)}>Batalkan</button>}{user.role === 'HRD' && row.status === 'PENDING' && <button type="button" onClick={() => setSelected(selected === row.id ? null : row.id)}>Tinjau</button>}</div>{user.role === 'HRD' && selected === row.id && row.status === 'PENDING' && <div className="mt-[1vw] grid gap-[1vw]"><p>Absensi asli: {row.attendance ? 'Sudah tercatat' : 'Tidak ada catatan untuk tanggal ini'}.</p><label className="grid gap-1">Catatan keputusan / alasan penolakan<textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} className="rounded-lg border border-dexa-border p-[1vw]" /></label><div className="flex gap-[1vw]"><button type="button" disabled={busy} onClick={() => void decide(row, 'approve')}>Setujui</button><button type="button" disabled={busy} onClick={() => void decide(row, 'reject')}>Tolak</button></div></div>}</article>)}{!requests.length && <p className="text-sm">Belum ada permintaan koreksi.</p>}</div>
    {preview && <div className="mt-[1vw]"><button type="button" onClick={() => setPreview('')}>Tutup bukti</button><img src={preview} alt="Bukti pendukung retroaktif" className="max-h-[70vw] w-full object-contain" /></div>}
  </section>
}
