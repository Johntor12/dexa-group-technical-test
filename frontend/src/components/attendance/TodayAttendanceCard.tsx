import type { FormEvent } from "react";
import type { Attendance } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";
import { FileUpload } from "../ui/FileUpload";
import { Button } from "../ui/Button";
import { LocationCapture } from './LocationCapture'
import type { WfhLocation } from './LocationCapture'
import samplePhoto from '../../assets/figma/asset-5.jpg'

interface TodayAttendanceCardProps {
  today: Attendance | null;
  busy: boolean;
  loading: boolean;
  file: File | null;
  location: WfhLocation | null;
  setLocation: (location: WfhLocation) => void;
  reason: string;
  setReason: (reason: string) => void;
  taskDescription: string;
  setTaskDescription: (task: string) => void;
  setFile: (file: File | null) => void;
  setError: (error: string) => void;
  keyRef: { current: string };
  onSubmit: (event: FormEvent) => void;
  onDashboard: () => void;
  formatTime: (value: string) => string;
  photoCapture: { capturedAt: string; offset: string | null } | null;
  checkingPhoto: boolean;
  photoDate: string;
  setPhotoDate: (value: string) => void;
  photoTime: string;
  setPhotoTime: (value: string) => void;
}

export function TodayAttendanceCard({ today, busy, loading, file, location, setLocation, reason, setReason, taskDescription, setTaskDescription, setFile, setError, keyRef, onSubmit, onDashboard, formatTime, photoCapture, checkingPhoto, photoDate, setPhotoDate, photoTime, setPhotoTime }: TodayAttendanceCardProps) {
  return <section className="attendance-submit-page">
    {today ? <div role="status" className="card grid gap-[1vw]">
      <StatusBadge active activeLabel="Check-in tercatat" inactiveLabel="" />
      <strong>Check-in hari ini sudah tercatat.</strong>
      <p>Waktu check-in server: {formatTime(today.submittedAt)} WIB</p>
    </div> : <>
      <div className="attendance-page-intro"><button type="button" className="back-link mb-[0.8vw]" onClick={onDashboard}>← Kembali ke dashboard</button><h2>Check-in WFH</h2><p>Unggah foto setup kerja, pastikan lokasi, dan lengkapi aktivitas yang dikerjakan.</p></div>
      <form onSubmit={onSubmit} className="attendance-submit-grid">
        <section className="attendance-photo-panel">
          <h3>Foto setup kerja *</h3>
          <p>Unggah foto aktivitas kerja Anda. Hindari menampilkan dokumen rahasia atau orang lain.</p>
          <FileUpload file={file} disabled={busy || loading} onError={setError} onChange={selected => { setFile(selected); keyRef.current = crypto.randomUUID() }} />
          {!file && <figure className="sample-photo"><img src={samplePhoto} alt="Contoh ilustrasi setup kerja WFH"/><figcaption>Contoh setup kerja · ilustrasi</figcaption></figure>}
          <div className="privacy-note"><strong>Privasi foto tetap terjaga</strong><span>Foto hanya dapat dilihat oleh Anda dan HRD.</span></div>
        </section>
        <section className="attendance-details-panel">
          <h3>Detail absensi</h3>
          <LocationCapture location={location} disabled={busy || loading} onChange={selected => { setLocation(selected); keyRef.current = crypto.randomUUID() }} onError={setError} />
          {photoCapture ? <div className="photo-metadata-grid"><label>Tanggal pengambilan foto<output>{photoCapture.capturedAt.slice(0, 10)}</output></label><label>Waktu pengambilan foto<output>{photoCapture.capturedAt.slice(11)}{photoCapture.offset ? ` ${photoCapture.offset}` : ''}</output></label></div> : file ? <><p className="small muted">Waktu tidak ditemukan pada metadata foto. Pilih tanggal dan jam sesuai cap air yang terlihat pada foto.</p><div className="photo-metadata-grid"><label>Tanggal pengambilan foto *<input required type="date" value={photoDate} disabled={checkingPhoto || busy} onChange={event => setPhotoDate(event.target.value)} /></label><label>Waktu pengambilan foto *<input required type="time" value={photoTime} disabled={checkingPhoto || busy} onChange={event => setPhotoTime(event.target.value)} /></label></div></> : <p className="small muted">Tanggal dan waktu akan dibaca dari metadata foto. Jika tidak tersedia, Anda dapat memilihnya berdasarkan cap air pada foto.</p>}
          <label>Task yang sedang dikerjakan *<textarea required maxLength={500} rows={3} value={taskDescription} onChange={event => { setTaskDescription(event.target.value); keyRef.current = crypto.randomUUID() }} placeholder="Jelaskan pekerjaan yang sedang Anda lakukan" /></label>
          <label>Alasan WFH (opsional)<textarea maxLength={500} rows={2} value={reason} onChange={event => { setReason(event.target.value); keyRef.current = crypto.randomUUID() }} placeholder="Contoh: membutuhkan fokus untuk menyelesaikan laporan" /></label>
          <div className="attendance-submit-action"><Button type="submit" variant="primary" loading={busy} disabled={loading || checkingPhoto || (!photoCapture && (!photoDate || !photoTime)) || !file || !location || !taskDescription.trim()}>Check-in</Button><p>Waktu check-in resmi dicatat oleh server; waktu foto ditampilkan terpisah.</p></div>
        </section>
      </form>
    </>}
  </section>
}
