import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { MissedCheckInClaim, Page, User } from "../../lib/api";

export function MissedCheckInClaimsPanel({
  token,
  user,
  onChanged,
}: {
  token: string;
  user: User;
  onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<MissedCheckInClaim[]>([]);
  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "REJECTED">(
    "PENDING",
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [meta, setMeta] = useState<Page<MissedCheckInClaim>["meta"] | null>(
    null,
  );
  const reviewer = user.role === "HRD";
  const canReview = !!user.missedCheckInReviewDepartments?.length;
  const load = useCallback(async () => {
    if (reviewer && !canReview) return;
    const route = reviewer
      ? "/attendance-claims/pending?limit=100&status=" + status
      : "/attendance-claims/me?limit=100";
    const page = await api<Page<MissedCheckInClaim>>(route, token);
    setRows(page.data);
    setMeta(page.meta);
  }, [token, reviewer, canReview, status]);
  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Gagal memuat klaim."),
    );
  }, [load]);
  async function decide(
    row: MissedCheckInClaim,
    decision: "approve" | "reject",
  ) {
    if (decision === "reject" && note.trim().length < 20) {
      setError("Alasan penolakan minimal 20 karakter.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/attendance-claims/" + row.id + "/" + decision, token, {
        method: "POST",
        body: JSON.stringify(
          decision === "approve"
            ? { note: note.trim() || undefined }
            : { reason: note.trim() },
        ),
      });
      setNotice(
        decision === "approve"
          ? "Klaim disetujui dan dicatat."
          : "Klaim ditolak.",
      );
      setSelected(null);
      setNote("");
      await load();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Keputusan gagal disimpan.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="grid gap-[1vw]">
      <header className="card grid gap-2">
        <span className="eyebrow">
          {reviewer ? "TINJAUAN HRD" : "KLAIM KEHADIRAN"}
        </span>
        <h2>{reviewer ? "Review Klaim Check-in" : "Riwayat Klaim Check-in"}</h2>
        <p>
          {reviewer
            ? "Tinjau klaim karyawan yang lupa check-in pada tanggal kerja sebelumnya."
            : "Lihat status klaim untuk tanggal check-in yang terlewat."}
        </p>
      </header>
      {reviewer && !canReview ? (
        <div className="card">
          <p>Akun ini belum memiliki izin reviewer klaim check-in.</p>
        </div>
      ) : (
        <>
          {reviewer && (
            <label className="flex items-center gap-2">
              Status klaim{" "}
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="PENDING">Menunggu</option>
                <option value="APPROVED">Disetujui</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </label>
          )}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-green-700">
              {notice}
            </p>
          )}
          <div className="grid gap-3">
            {rows.map((row) => (
              <article className="card grid gap-3" key={row.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {row.employee?.fullName ?? "Klaim check-in"}
                    </h3>
                    <p className="muted">
                      {row.employee?.employeeNumber ?? ""}
                      {row.employee?.department
                        ? " · " + row.employee.department
                        : ""}
                    </p>
                  </div>
                  <span className="status">
                    {row.status === "PENDING"
                      ? "Menunggu"
                      : row.status === "APPROVED"
                        ? "Disetujui"
                        : "Ditolak"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <div>
                    <dt className="muted">Tanggal kerja</dt>
                    <dd>{row.workDate}</dd>
                  </div>
                  <div>
                    <dt className="muted">Perkiraan waktu</dt>
                    <dd>
                      {row.claimedCheckInTime}–{row.claimedCheckOutTime}
                    </dd>
                  </div>
                  <div className="col-span-2 max-sm:col-span-1">
                    <dt className="muted">Alasan</dt>
                    <dd>{row.reason}</dd>
                  </div>
                  <div>
                    <dt className="muted">Diajukan</dt>
                    <dd>
                      {new Date(row.requestedAt).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                      })}
                    </dd>
                  </div>
                  {row.reviewNote && (
                    <div className="col-span-2 max-sm:col-span-1">
                      <dt className="muted">Catatan reviewer</dt>
                      <dd>{row.reviewNote}</dd>
                    </div>
                  )}
                </dl>
                {reviewer && row.status === "PENDING" && (
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(selected === row.id ? null : row.id);
                        setNote("");
                      }}
                    >
                      {selected === row.id ? "Tutup keputusan" : "Tinjau klaim"}
                    </button>
                    {selected === row.id && (
                      <>
                        <label>
                          Catatan keputusan / alasan penolakan
                          <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            minLength={20}
                            maxLength={1000}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void decide(row, "approve")}
                          >
                            Setujui
                          </button>
                          <button
                            type="button"
                            disabled={busy || note.trim().length < 20}
                            onClick={() => void decide(row, "reject")}
                          >
                            Tolak
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
            {!rows.length && (
              <div className="card">
                {reviewer
                  ? "Tidak ada klaim pada status ini."
                  : "Belum ada klaim check-in."}
              </div>
            )}
          </div>
          {meta && <p className="small muted">{meta.total} klaim</p>}
        </>
      )}
    </section>
  );
}
