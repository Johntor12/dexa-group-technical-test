import type { User } from '../../lib/api'
import { Button } from '../ui/Button'

export function ProfilePage({ user, onLogout, onBack }: { user: User; onLogout: () => void; onBack: () => void }) {
  return <section className="card mx-auto grid max-w-[52.8vw] gap-[1.5vw] max-lg:max-w-full"><Button className="justify-self-start" onClick={onBack}>← Kembali</Button><h2>Profil saya</h2><dl className="grid gap-[1vw]"><div><dt className="muted">Nama</dt><dd>{user.employee?.fullName ?? 'Human Resources'}</dd></div><div><dt className="muted">Peran</dt><dd>{user.role === 'HRD' ? 'HRD' : 'Karyawan'}</dd></div></dl><Button onClick={onLogout}>Keluar</Button></section>
}
