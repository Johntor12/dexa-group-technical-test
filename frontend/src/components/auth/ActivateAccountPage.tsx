import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'

export function ActivateAccountPage({ token, onComplete }: { token: string; onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmation) { setError('Konfirmasi kata sandi tidak sama.'); return }
    setBusy(true); setError('')
    try {
      await api('/auth/activate', '', { method: 'POST', body: JSON.stringify({ token, password }) })
      onComplete()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Aktivasi gagal. Minta tautan baru kepada HRD.')
    } finally { setBusy(false) }
  }

  return <main className="login-page">
    <section className="login-story" aria-label="Tentang DexaWork">
      <strong className="login-brand">DexaWork</strong>
      <div className="login-story-content"><span className="eyebrow">AKTIVASI AKUN</span><h1>Mulai bekerja dengan aman.</h1><p>Tetapkan kata sandi pribadi untuk mengakses dashboard dan absensi WFH.</p></div>
      <p className="story-note">Tautan aktivasi berlaku satu kali selama 24 jam.</p>
    </section>
    <section className="login-panel">
      <div className="mobile-brand">DexaWork</div>
      <span className="eyebrow">AKUN KARYAWAN</span>
      <h2>Aktivasi akun</h2>
      <p className="muted">Buat kata sandi yang hanya Anda ketahui.</p>
      {error && <div role="alert" className="alert error">{error}</div>}
      <form onSubmit={submit}>
        <label>Kata sandi baru<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Ulangi kata sandi<input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        <button className="primary" disabled={busy}>{busy ? 'Mengaktifkan...' : 'Aktifkan akun'}</button>
      </form>
      <p className="small muted">Jika tautan kedaluwarsa, minta HRD membuat tautan baru.</p>
    </section>
  </main>
}
