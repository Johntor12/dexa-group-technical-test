import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'
import { PasswordField } from '../ui/PasswordField'

export function ResetPasswordPage({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password !== confirmation) {
      setError('Konfirmasi kata sandi tidak sama.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await api('/auth/reset-password', '', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setComplete(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tautan reset tidak valid atau sudah kedaluwarsa.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page">
    <section className="login-story" aria-label="Tentang DexaWork">
      <strong className="login-brand">DexaWork</strong>
      <div className="login-story-content"><span className="eyebrow">KEAMANAN AKUN</span><h1>Kata sandi baru, akses tetap aman.</h1><p>Buat kata sandi baru untuk melanjutkan menggunakan DexaWork.</p></div>
      <p className="story-note">Tautan hanya dapat digunakan satu kali.</p>
    </section>
    <section className="login-panel">
      <div className="mobile-brand">DexaWork</div>
      <span className="eyebrow">RESET KATA SANDI</span>
      <h2>{complete ? 'Kata sandi diperbarui' : 'Buat kata sandi baru'}</h2>
      {complete ? <>
        <div role="status" className="alert success">Kata sandi berhasil diubah. Semua sesi sebelumnya sudah dikeluarkan.</div>
        <a className="primary inline-flex justify-center" href="/">Masuk dengan kata sandi baru</a>
      </> : <>
        <p className="muted">Gunakan minimal 12 karakter.</p>
        {error && <div role="alert" className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <PasswordField label="Kata sandi baru" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} />
          <PasswordField label="Ulangi kata sandi baru" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          <button className="primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kata sandi baru'}</button>
        </form>
      </>}
      <p className="small muted"><a href="/">Kembali ke halaman masuk</a></p>
    </section>
  </main>
}
