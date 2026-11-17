import { useState } from "react";
import type { FormEvent } from "react";
import eyeIcon from "../../assets/icons/eye.svg";

interface SignInPageProps {
  email: string;
  password: string;
  busy: boolean;
  error: string;
  notice?: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export function SignInPage({
  email,
  password,
  busy,
  error,
  notice,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: SignInPageProps) {
  const [visible, setVisible] = useState(false);

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Tentang DexaWork">
        <strong className="login-brand">DexaWork</strong>
        <div className="login-story-content">
          <span className="eyebrow">RUANG KERJA, LEBIH TERATUR</span>
          <h1>
            Kerja dari
            <br />
            mana saja.
            <br />
            Tetap tercatat.
          </h1>
          <p>
            Absensi yang sederhana.
            <br />
            Ruang untuk fokus pada pekerjaan Anda.
          </p>
          <span className="story-accent" aria-hidden="true" />
          <p className="story-steps">
            01&nbsp; Unggah foto&nbsp;&nbsp;&nbsp; 02&nbsp;
            Kirim&nbsp;&nbsp;&nbsp; 03&nbsp; Tercatat
          </p>
        </div>
        <p className="story-note">Kehadiran jelas. Privasi tetap terjaga.</p>
      </section>
      <section className="login-panel">
        <div className="mobile-brand">
          DexaWork <span>Kehadiran jelas. Kerja lebih tenang.</span>
        </div>
        <span className="eyebrow">SELAMAT DATANG KEMBALI</span>
        <h2>Masuk ke DexaWork</h2>
        <p className="muted">Gunakan akun kerja untuk melanjutkan.</p>
        {error && (
          <div role="alert" className="alert error">
            {error}
          </div>
        )}
        {notice && <div role="status" className="alert success">{notice}</div>}
        <form onSubmit={onSubmit}>
          <label>
            Email kantor
            <input
              type="email"
              autoComplete="username"
              placeholder="nama@perusahaan.co.id"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </label>
          <label>
            Kata sandi
            <span className="password-field">
              <input
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
              <button
                type="button"
                aria-label={
                  visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                onClick={() => setVisible(!visible)}
              >
                <img src={eyeIcon} alt="" />
              </button>
            </span>
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Memproses…" : "Masuk"}
          </button>
        </form>
        <p className="small muted">
          Akses sesuai peran akun Anda: Karyawan atau HRD.
        </p>
        <p className="small"><a href="/forgot-password">Lupa kata sandi?</a></p>
      </section>
    </main>
  );
}
