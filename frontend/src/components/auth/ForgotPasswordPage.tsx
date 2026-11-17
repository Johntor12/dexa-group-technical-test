import { useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../../lib/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api<{ success: boolean; developmentResetUrl?: string }>(
        '/auth/forgot-password',
        '',
        { method: 'POST', body: JSON.stringify({ email }) },
      )
      setDevelopmentResetUrl(result?.developmentResetUrl ?? '')
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Permintaan belum dapat diproses. Coba kembali.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="login-page">
    <section className="login-story" aria-label="Tentang DexaWork">
      <strong className="login-brand">DexaWork</strong>
      <div className="login-story-content"><span className="eyebrow">AKSES AKUN</span><h1>Kembali bekerja dengan tenang.</h1><p>Atur ulang kata sandi melalui tautan aman yang hanya berlaku satu kali.</p></div>
      <p className="story-note">Tautan reset berlaku selama 30 menit.</p>
    </section>
    <section className="login-panel">
      <div className="mobile-brand">DexaWork</div>
      <span className="eyebrow">LUPA KATA SANDI</span>
      <h2>Atur ulang kata sandi</h2>
      <p className="muted">Masukkan email akun Anda. Jika terdaftar, kami akan mengirim tautan reset.</p>
      {error && <div role="alert" className="alert error">{error}</div>}
      {submitted ? <div role="status" className="alert success">
        Jika email tersebut terdaftar dan aktif, tautan reset sudah dikirim. Periksa juga folder spam.
        {developmentResetUrl && <p className="mt-[1vw] break-all">Mode lokal: <a href={developmentResetUrl}>Buka tautan reset</a></p>}
      </div> : <form onSubmit={submit}>
        <label>Email kantor<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@perusahaan.co.id" /></label>
        <button className="primary" disabled={busy}>{busy ? 'Memproses…' : 'Kirim tautan reset'}</button>
      </form>}
      <p className="small muted"><a href="/">Kembali ke halaman masuk</a></p>
    </section>
  </main>
}
