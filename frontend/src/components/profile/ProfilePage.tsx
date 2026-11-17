import type { User } from '../../lib/api'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '../ui/Button'
import { PasswordField } from '../ui/PasswordField'

export function ProfilePage({ user, onLogout, onBack, onChangePassword }: { user: User; onLogout: () => void; onBack: () => void; onChangePassword: (currentPassword: string, newPassword: string) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (newPassword !== confirmation) { setError('Konfirmasi kata sandi baru tidak sama.'); return }
    setBusy(true)
    try {
      await onChangePassword(currentPassword, newPassword)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kata sandi tidak dapat diperbarui.')
      setBusy(false)
    }
  }
  return <section className="card mx-auto grid max-w-[52.8vw] gap-[1.5vw] max-lg:max-w-full"><Button className="justify-self-start" onClick={onBack}>← Kembali</Button><h2>Profil saya</h2><dl className="grid gap-[1vw]"><div><dt className="muted">Nama</dt><dd>{user.employee?.fullName ?? 'Human Resources'}</dd></div><div><dt className="muted">Peran</dt><dd>{user.role === 'HRD' ? 'HRD' : 'Karyawan'}</dd></div></dl>
    <div className="grid gap-[1vw] rounded-2xl border border-dexa-red/25 bg-dexa-red/5 p-[1.5vw] max-sm:gap-4 max-sm:p-4">
      <div><h3>Ganti kata sandi</h3><p className="muted">Sesi di perangkat lain akan dikeluarkan setelah kata sandi diperbarui.</p></div>
      {error && <div role="alert" className="alert error">{error}</div>}
      <form className="grid gap-[1vw] max-sm:gap-4" onSubmit={submit}>
        <PasswordField label="Kata sandi saat ini" autoComplete="current-password" required maxLength={72} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
        <PasswordField label="Kata sandi baru" autoComplete="new-password" required minLength={12} maxLength={72} value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        <PasswordField label="Ulangi kata sandi baru" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
        <Button type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kata sandi'}</Button>
      </form>
    </div>
    <Button onClick={onLogout}>Keluar</Button></section>
}
