import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api, ApiError } from './lib/api'
import type { User, Employee, Attendance, Page, Department, DepartmentCode } from './lib/api'
import { SignInPage } from './components/auth/SignInPage'
import { ActivateAccountPage } from './components/auth/ActivateAccountPage'
import { WorkspaceSidebar } from './components/layout/WorkspaceSidebar'
import { EmployeeForm } from './components/employees/EmployeeForm'
import type { EmployeeFormValues } from './components/employees/EmployeeForm'
import { TodayAttendanceCard } from './components/attendance/TodayAttendanceCard'
import type { WfhLocation } from './components/attendance/LocationCapture'
import { SubmissionSuccess } from './components/attendance/SubmissionSuccess'
import { AttendanceDetail } from './components/attendance/AttendanceDetail'
import { CorrectionPanel } from './components/attendance/CorrectionPanel'
import { ProfilePage } from './components/profile/ProfilePage'
import { RecordsSection } from './components/records/RecordsSection'
import { DashboardOverview } from './components/dashboard/DashboardOverview'
import { Modal } from './components/ui/Modal'

type View = 'dashboard' | 'attendance' | 'employees' | 'submit' | 'success' | 'detail' | 'profile' | 'employee-form'
const time = (value: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value))
const jakartaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const emptyForm: EmployeeFormValues = { email: '', fullName: '', employeeNumber: '', department: '', position: '' }
const base = (role: User['role']) => role === 'HRD' ? '/hr' : '/app'
function pathFor(view: View, role: User['role'], id?: string) {
 const root = base(role)
 if (view === 'dashboard') return root
 if (view === 'profile') return `${root}/profile`
 if (view === 'submit') return '/app/attendance/new'
 if (view === 'success') return '/app/attendance/success'
 if (view === 'employees') return '/hr/employees'
 if (view === 'employee-form') return id ? `/hr/employees/${id}/edit` : '/hr/employees/new'
 if (view === 'detail') return `${root}/attendance/${id}`
 return role === 'HRD' ? '/hr/attendance' : '/app/attendance/history'
}
function routeFor(path: string, role: User['role']): { view: View; id?: string } {
 if (path === `${base(role)}/profile`) return { view: 'profile' }
 if (role === 'EMPLOYEE') {
  if (path === '/app/attendance/new') return { view: 'submit' }
  if (path === '/app/attendance/success') return { view: 'success' }
  if (path.startsWith('/app/attendance/') && path !== '/app/attendance/history') return { view: 'detail', id: path.split('/').pop() }
  if (path === '/app/attendance/history') return { view: 'attendance' }
 } else {
  if (path === '/hr/employees/new') return { view: 'employee-form' }
  if (/^\/hr\/employees\/[^/]+\/edit$/.test(path)) return { view: 'employee-form', id: path.split('/')[3] }
  if (path === '/hr/employees') return { view: 'employees' }
  if (path.startsWith('/hr/attendance/')) return { view: 'detail', id: path.split('/').pop() }
  if (path === '/hr/attendance') return { view: 'attendance' }
 }
 return { view: 'dashboard' }
}
async function allPages<T>(path: string, token: string): Promise<T[]> {
 const join = path.includes('?') ? '&' : '?'
 const first = await api<Page<T>>(`${path}${join}page=1&limit=100`, token)
 const rest = await Promise.all(Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, i) => api<Page<T>>(`${path}${join}page=${i + 2}&limit=100`, token)))
 return [first, ...rest].flatMap(result => result.data)
}

function App() {
 const [token, setToken] = useState('')
 const [user, setUser] = useState<User | null>(null)
 const [view, setView] = useState<View>('dashboard')
 const [error, setError] = useState('')
 const [notice, setNotice] = useState('')
 const [busy, setBusy] = useState(false)
 const [loading, setLoading] = useState(false)
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [page, setPage] = useState(1)
 const [search, setSearch] = useState('')
 const [date, setDate] = useState('')
 const [department, setDepartment] = useState<DepartmentCode | ''>('')
 const [departments, setDepartments] = useState<Department[]>([])
 const [employees, setEmployees] = useState<Page<Employee> | null>(null)
 const [attendances, setAttendances] = useState<Page<Attendance> | null>(null)
 const [today, setToday] = useState<Attendance | null>(null)
 const [stats, setStats] = useState<{ total: number; submitted: number; pending: number } | null>(null)
 const [missingEmployees, setMissingEmployees] = useState<Employee[]>([])
 const [form, setForm] = useState(emptyForm)
 const [editing, setEditing] = useState<string | null>(null)
 const [file, setFile] = useState<File | null>(null)
 const [location, setLocation] = useState<WfhLocation | null>(null)
 const [reason, setReason] = useState('')
 const key = useRef(crypto.randomUUID())
 const [detail, setDetail] = useState<Attendance | null>(null)
 const [image, setImage] = useState('')
 const [dashboardImages, setDashboardImages] = useState<Record<string, string>>({})
 const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null)
 const [activation, setActivation] = useState<{ token: string; expiresAt: string; email: string } | null>(null)
 const generation = useRef(0)
 const navigate = useCallback((next: View, role: User['role'], id?: string) => {
  window.history.pushState({}, '', pathFor(next, role, id)); setView(next); setError(''); setNotice('')
  if (next === 'attendance' || next === 'employees') { setPage(1); setSearch('') }
 }, [])
 const report = useCallback((e: unknown) => {
  setError(e instanceof Error ? e.message : 'Terjadi kesalahan. Coba kembali.')
  if (e instanceof ApiError && e.status === 401) { generation.current++; setUser(null); setToken(''); setEmployees(null); setAttendances(null); setToday(null); setDepartments([]); setImage(''); setFile(null); setLoading(false); window.history.replaceState({}, '', '/') }
 }, [])
 const reload = useCallback(async () => {
  if (!user) return
  const current = ++generation.current
  setLoading(true)
  try {
   if (view === 'detail') {
    const id = window.location.pathname.split('/').pop()
    const record = await api<Attendance>(`/attendances/${id}`, token)
    const blob = record.source === 'CORRECTION' ? null : await api<Blob>(`/attendances/${id}/evidence`, token)
    if (current === generation.current) { setDetail(record); setImage(blob ? URL.createObjectURL(blob) : '') }
   } else if (view === 'employee-form' && window.location.pathname.endsWith('/edit')) {
    const id = window.location.pathname.split('/')[3]
    const employee = await api<Employee>(`/employees/${id}`, token)
    if (current === generation.current) { setEditing(id); setForm({ email: employee.user.email, fullName: employee.fullName, employeeNumber: employee.employeeNumber, position: employee.position, department: employee.department }) }
   } else if (view === 'employees') {
    const q = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) q.set('search', search)
    if (department) q.set('department', department)
    const result = await api<Page<Employee>>(`/employees?${q}`, token)
    if (current === generation.current) setEmployees(result)
   } else if (view === 'dashboard' || view === 'attendance') {
    const q = new URLSearchParams({ page: String(page), limit: '20' })
    if (search && view === 'attendance') q.set('search', search)
    if (date && view === 'attendance') q.set('date', date)
    if (department && view === 'attendance') q.set('department', department)
    const result = await api<Page<Attendance>>(`/attendances${user.role === 'EMPLOYEE' ? '/me' : ''}?${q}`, token)
    if (current === generation.current) setAttendances(result)
    if (view === 'dashboard' && user.role === 'HRD') {
     const previews = await Promise.all(result.data.slice(0, 3).map(async record => {
      try { return [record.id, URL.createObjectURL(await api<Blob>(`/attendances/${record.id}/evidence`, token))] as const }
      catch { return null }
     }))
     if (current === generation.current) setDashboardImages(Object.fromEntries(previews.filter(item => item !== null)))
     else previews.forEach(item => { if (item) URL.revokeObjectURL(item[1]) })
    }
    if (view === 'attendance' && user.role === 'HRD') {
     const [staff, records] = await Promise.all([allPages<Employee>('/employees', token), allPages<Attendance>(`/attendances?date=${date || jakartaDate()}`, token)])
     const submitted = new Set(records.map(record => record.employeeId))
     if (current === generation.current) setMissingEmployees(staff.filter(employee => employee.active && !submitted.has(employee.id)))
    }
    if (view === 'dashboard' && user.role === 'HRD') {
     const [staff, records] = await Promise.all([allPages<Employee>('/employees', token), allPages<Attendance>(`/attendances?date=${jakartaDate()}`, token)])
     const active = staff.filter(employee => employee.active)
     const submitted = new Set(records.map(record => record.employeeId))
     if (current === generation.current) setStats({ total: active.length, submitted: active.filter(employee => submitted.has(employee.id)).length, pending: active.filter(employee => !submitted.has(employee.id)).length })
    }
   }
   if (user.role === 'EMPLOYEE' && (view === 'dashboard' || view === 'submit' || view === 'attendance' || view === 'success')) {
    const result = await api<Attendance | null>('/attendances/me/today', token)
    if (current === generation.current) setToday(result)
    if (view === 'success' && result) {
     const blob = await api<Blob>(`/attendances/${result.id}/evidence`, token)
     if (current === generation.current) setImage(URL.createObjectURL(blob))
    }
   }
  } catch (e) { if (current === generation.current) report(e) }
  finally { if (current === generation.current) setLoading(false) }
 }, [user, token, page, search, date, department, view, report])
 useEffect(() => { let active = true; const invalidate = () => { generation.current++ }; queueMicrotask(() => { if (active) void reload() }); return () => { active = false; invalidate() } }, [reload])
 useEffect(() => { if (user?.role === 'HRD') void api<Department[]>('/employees/departments', token).then(setDepartments).catch(report) }, [user, token, report])
 useEffect(() => { if (!user) return; const pop = () => { const route = routeFor(window.location.pathname, user.role); setView(route.view); setError('') }; window.addEventListener('popstate', pop); return () => window.removeEventListener('popstate', pop) }, [user])
 useEffect(() => { const objectUrl = image; return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) } }, [image])
 useEffect(() => { const urls = Object.values(dashboardImages); return () => urls.forEach(url => URL.revokeObjectURL(url)) }, [dashboardImages])
 async function login(e: FormEvent) {
  e.preventDefault(); setBusy(true); setError('')
  try { const result = await api<{ accessToken: string; user: User }>('/auth/login', '', { method: 'POST', body: JSON.stringify({ email, password }) }); setUser(result.user); setToken(result.accessToken); setPassword(''); setNotice(''); setPage(1); const route = routeFor(window.location.pathname, result.user.role); setView(route.view); if (route.view === 'dashboard') window.history.replaceState({}, '', base(result.user.role)) }
  catch (e) { report(e) } finally { setBusy(false) }
 }
 async function logout() {
  setBusy(true)
  try { await api('/auth/logout', token, { method: 'POST' }); generation.current++; setEmployees(null); setAttendances(null); setDepartments([]); setLoading(false); setToken(''); setUser(null); setSearch(''); setDate(''); setDepartment(''); setToday(null); setFile(null); setImage(''); setNotice(''); setError(''); window.history.replaceState({}, '', '/') }
  catch (e) { report(e) } finally { setBusy(false) }
 }
 async function save(e: FormEvent) {
  e.preventDefault(); setBusy(true); setError('')
  try { const result = await api<Employee & { activation?: { token: string; expiresAt: string } }>(`/employees${editing ? `/${editing}` : ''}`, token, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) }); const message = editing ? 'Data karyawan diperbarui.' : 'Karyawan dan akun berhasil dibuat.'; if (result.activation) setActivation({ ...result.activation, email: result.user.email }); setForm(emptyForm); setEditing(null); navigate('employees', 'HRD'); setNotice(message) }
  catch (e) { report(e) } finally { setBusy(false) }
 }
 async function deactivate() {
  if (!pendingDeactivate) return
  setBusy(true); setError('')
  try { await api(`/employees/${pendingDeactivate.id}`, token, { method: 'DELETE' }); setPendingDeactivate(null); setNotice('Karyawan dinonaktifkan.'); await reload() }
  catch (e) { report(e) } finally { setBusy(false) }
 }
 async function reissue(employee: Employee) {
  setBusy(true); setError('')
  try { const result = await api<{ token: string; expiresAt: string }>(`/employees/${employee.id}/activation-link`, token, { method: 'POST' }); setActivation({ ...result, email: employee.user.email }) }
  catch (e) { report(e) } finally { setBusy(false) }
 }
 async function submit(e: FormEvent) {
  e.preventDefault(); if (!file) return; setBusy(true); setError('')
  try { if (!location) { setError('Ambil lokasi WFH sebelum mengirim absensi.'); return }; const data = new FormData(); data.append('photo', file); data.append('latitude', String(location.latitude)); data.append('longitude', String(location.longitude)); data.append('locationAccuracy', String(location.locationAccuracy)); if (reason.trim()) data.append('wfhReason', reason.trim()); const record = await api<Attendance>('/attendances', token, { method: 'POST', headers: { 'Idempotency-Key': key.current }, body: data }); setToday(record); setFile(null); setLocation(null); setReason(''); key.current = crypto.randomUUID(); navigate('success', 'EMPLOYEE') }
  catch (e) {
   if (e instanceof ApiError && e.status >= 500) { try { const existing = await api<Attendance | null>('/attendances/me/today', token); if (existing) { setToday(existing); setFile(null); key.current = crypto.randomUUID(); navigate('success', 'EMPLOYEE'); return } } catch { /* keep file and retry key */ } }
   report(e)
  } finally { setBusy(false) }
 }
 function edit(employee: Employee) { setEditing(employee.id); setForm({ email: employee.user.email, fullName: employee.fullName, employeeNumber: employee.employeeNumber, position: employee.position, department: employee.department }); navigate('employee-form', 'HRD', employee.id) }
 function openDetail(id: string) { setDetail(null); setImage(''); navigate('detail', user!.role, id) }
 if (window.location.pathname.startsWith('/activate/')) return <ActivateAccountPage token={window.location.pathname.split('/')[2]} onComplete={() => { window.history.replaceState({}, '', '/'); setUser(null); setToken(''); setNotice('Akun aktif. Silakan masuk dengan kata sandi baru Anda.') }} />
 if (!user) return <SignInPage email={email} password={password} busy={busy} error={error} notice={notice} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={login} />
 const section = view === 'employees' || view === 'employee-form' ? 'employees' : view === 'dashboard' ? 'dashboard' : view === 'profile' ? 'profile' : 'attendance'
 const title = view === 'employees' ? 'Data karyawan' : view === 'employee-form' ? editing ? 'Ubah karyawan' : 'Tambah karyawan' : view === 'dashboard' ? 'Dashboard' : view === 'submit' ? 'Kirim absensi' : view === 'success' ? 'Konfirmasi absensi' : view === 'profile' ? 'Profil saya' : view === 'detail' ? 'Detail absensi' : user.role === 'HRD' ? 'Monitor absensi' : 'Riwayat absensi'
 return <div className="workspace">
  <WorkspaceSidebar user={user} view={section} busy={busy} onViewChange={next => navigate(next, user.role)} onSubmit={() => navigate('submit', 'EMPLOYEE')} onProfile={() => navigate('profile', user.role)} onLogout={() => void logout()} />
  <main className="content"><header><div><span className="eyebrow">PHARMAWORK / {user.role === 'HRD' ? 'PEOPLE OPERATIONS' : 'MY WORKSPACE'}</span><h1>{title}</h1><p className="muted">Kehadiran WFH tercatat berdasarkan waktu server.</p></div>{view === 'employees' && <button className="primary" onClick={() => { setForm({ ...emptyForm, department: departments[0]?.code ?? '' }); setEditing(null); navigate('employee-form', 'HRD') }}>+ Tambah karyawan</button>}</header>
  {error && <div role="alert" className="alert error">{error}</div>}{notice && <div role="status" className="alert success">{notice}</div>}
  {view === 'dashboard' && <DashboardOverview user={user} today={today} attendances={attendances} stats={stats} previewUrls={dashboardImages} onDetail={openDetail} onNavigate={() => navigate(user.role === 'EMPLOYEE' && !today ? 'submit' : 'attendance', user.role)} formatTime={time} />}
  {user.role === 'EMPLOYEE' && view === 'submit' && <TodayAttendanceCard today={today} busy={busy} loading={loading} file={file} setFile={setFile} location={location} setLocation={setLocation} reason={reason} setReason={setReason} setError={setError} keyRef={key} onSubmit={submit} formatTime={time} />}
  {view === 'success' && today && <SubmissionSuccess attendance={today} preview={image} onHistory={() => navigate('attendance', 'EMPLOYEE')} formatTime={time} />}
  {view === 'profile' && <ProfilePage user={user} onLogout={() => void logout()} onBack={() => navigate('dashboard', user.role)} />}
  {view === 'employee-form' && <EmployeeForm form={form} setForm={setForm} editing={editing} departments={departments} busy={busy} onSave={save} onCancel={() => navigate('employees', 'HRD')} />}
  {view === 'detail' && (detail ? <AttendanceDetail attendance={detail} image={image} onBack={() => navigate('attendance', user.role)} formatTime={time} /> : <p className="muted">{loading ? 'Memuat detail absensi...' : 'Detail absensi belum tersedia.'}</p>)}
  {(view === 'attendance' || view === 'employees') && <RecordsSection view={view} user={user} employees={employees} attendances={attendances} missingEmployees={missingEmployees} departments={departments} page={page} search={search} date={date} department={department} loading={loading} busy={busy} onSearchChange={value => { setSearch(value); setPage(1) }} onDateChange={value => { setDate(value); setPage(1) }} onDepartmentChange={value => { setDepartment(value); setPage(1) }} onPageChange={setPage} onReload={reload} onEdit={edit} onReissue={reissue} onDeactivate={employee => { setPendingDeactivate(employee); return Promise.resolve() }} onEvidence={async id => openDetail(id)} formatTime={time} />}
  {view === 'attendance' && <CorrectionPanel token={token} user={user} onChanged={reload} />}
  <p className="small muted footer-note">DexaWork / Bukti absensi langsung diakses pemilik dan HRD; bukti koreksi diakses pemilik dan reviewer berwenang.</p></main>
  <Modal open={!!pendingDeactivate} title="Nonaktifkan karyawan" onClose={() => setPendingDeactivate(null)}><p>Nonaktifkan {pendingDeactivate?.fullName}? Riwayat absensi tetap disimpan.</p><div className="mt-[1.5vw] flex gap-[1vw]"><button disabled={busy} onClick={() => void deactivate()} className="primary">Nonaktifkan</button><button disabled={busy} onClick={() => setPendingDeactivate(null)}>Batal</button></div></Modal>
  <Modal open={!!activation} title="Tautan aktivasi akun" onClose={() => setActivation(null)}><p>Bagikan tautan ini secara pribadi kepada {activation?.email}. Tautan berlaku sampai {activation?.expiresAt ? time(activation.expiresAt) : ''} WIB dan hanya dapat dipakai sekali.</p><p className="mt-[1vw] break-all rounded-lg border border-dexa-border bg-dexa-bg p-[1vw]" data-testid="activation-link">{activation ? `${window.location.origin}/activate/${activation.token}` : ''}</p><button className="primary mt-[1vw]" onClick={() => { if (activation) void navigator.clipboard.writeText(`${window.location.origin}/activate/${activation.token}`) }}>Salin tautan</button></Modal>
 </div>
}
export default App
