import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

export type WorkProofType = "SCREEN" | "WORKSPACE";
export interface AttendanceCaptureBundle {
  workProof: File;
  selfie: File;
  workProofType: WorkProofType;
}

type CaptureTarget = "workProof" | "selfie";

export function AttendanceCaptureForm({
  phase,
  busy,
  loading = false,
  keyRef,
  onSubmit,
  onCancel,
}: {
  phase: "CHECKIN" | "CHECKOUT";
  busy: boolean;
  loading?: boolean;
  keyRef: { current: string };
  onSubmit: (bundle: AttendanceCaptureBundle) => void;
  onCancel: () => void;
}) {
  const [workProofType, setWorkProofType] =
    useState<WorkProofType>("WORKSPACE");
  const [workProof, setWorkProof] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [target, setTarget] = useState<CaptureTarget | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("");

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current
        .play()
        .catch(() => setError("Kamera tidak dapat diputar di browser ini."));
    }
  }, [stream]);

  useEffect(
    () => () => stream?.getTracks().forEach((track) => track.stop()),
    [stream],
  );

  useEffect(() => {
    const url = workProof ? URL.createObjectURL(workProof) : "";
    setProofUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [workProof]);
  useEffect(() => {
    const url = selfie ? URL.createObjectURL(selfie) : "";
    setSelfieUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [selfie]);

  function stopStream() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setTarget(null);
  }

  async function startCapture(next: CaptureTarget) {
    setError("");
    stopStream();
    try {
      if (!navigator.mediaDevices)
        throw new Error("Browser tidak menyediakan akses media.");
      let active: MediaStream;
      if (next === "workProof" && workProofType === "SCREEN") {
        if (!navigator.mediaDevices.getDisplayMedia)
          throw new Error(
            "Capture layar tidak didukung browser ini. Pilih foto setup kerja.",
          );
        active = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } else {
        const facingMode = next === "selfie" ? "user" : "environment";
        try {
          active = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1600 },
              height: { ideal: 1200 },
            },
          });
        } catch (cameraError) {
          if (next !== "workProof" || facingMode !== "environment")
            throw cameraError;
          active = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }
      }
      setTarget(next);
      setStream(active);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Izin kamera atau capture layar ditolak.",
      );
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || !target || !video.videoWidth || !video.videoHeight) {
      setError("Tunggu sampai pratinjau siap, lalu ambil capture.");
      return;
    }
    const scale = Math.min(1, 1600 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context)
      return setError("Browser tidak dapat memproses gambar capture.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const stamp = new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    const stripHeight = Math.max(40, Math.round(canvas.height * 0.065));
    context.fillStyle = "rgba(20, 25, 31, 0.78)";
    context.fillRect(0, canvas.height - stripHeight, canvas.width, stripHeight);
    context.fillStyle = "#ffffff";
    context.font = `600 ${Math.max(18, Math.round(stripHeight * 0.42))}px sans-serif`;
    context.fillText(
      `${phase} · ${stamp} WIB · waktu perangkat`,
      16,
      canvas.height - Math.round(stripHeight * 0.34),
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.84),
    );
    if (!blob) return setError("Gambar capture gagal diproses.");
    if (blob.size > 5 * 1024 * 1024)
      return setError("Ukuran hasil capture melebihi 5 MiB.");
    const name = `${phase.toLowerCase()}-${target === "selfie" ? "selfie" : "work-proof"}.jpg`;
    const file = new File([blob], name, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    if (target === "selfie") setSelfie(file);
    else setWorkProof(file);
    keyRef.current = crypto.randomUUID();
    stopStream();
  }

  return (
    <form
      className="grid gap-[1.2vw]"
      onSubmit={(event) => {
        event.preventDefault();
        if (workProof && selfie) onSubmit({ workProof, selfie, workProofType });
      }}
    >
      <fieldset className="grid gap-[1vw] rounded-2xl border border-[#A52823]/40 bg-[#FFF9F8] p-[1.2vw] shadow-sm max-sm:gap-[3vw] max-sm:p-[4vw]">
        <legend className="px-2 font-semibold text-[#A52823]">Bukti area kerja</legend>
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[#A52823]/25 bg-white max-sm:grid-cols-1">
          <label className={`flex min-h-[5.5vw] cursor-pointer flex-col items-center justify-center gap-[0.55vw] px-[1vw] py-[0.8vw] text-center font-semibold text-slate-800 transition-colors max-sm:min-h-[18vw] max-sm:gap-[2vw] max-sm:px-[3vw] max-sm:py-[3vw] ${workProofType === "WORKSPACE" ? "bg-[#FBEDEC]" : "hover:bg-[#FFF8F7]"}`}>
            <input
              type="radio"
              className="h-[1vw] w-[1vw] accent-[#A52823] max-sm:h-[4vw] max-sm:w-[4vw]"
              checked={workProofType === "WORKSPACE"}
              disabled={busy || loading || !!target}
              onChange={() => {
                setWorkProofType("WORKSPACE");
                setWorkProof(null);
                keyRef.current = crypto.randomUUID();
              }}
            />
            <span>Foto setup kerja langsung</span>
          </label>
          <label className={`flex min-h-[5.5vw] cursor-pointer flex-col items-center justify-center gap-[0.55vw] border-l border-[#A52823]/20 px-[1vw] py-[0.8vw] text-center font-semibold text-slate-800 transition-colors max-sm:min-h-[18vw] max-sm:gap-[2vw] max-sm:border-l-0 max-sm:border-t max-sm:px-[3vw] max-sm:py-[3vw] ${workProofType === "SCREEN" ? "bg-[#FBEDEC]" : "hover:bg-[#FFF8F7]"}`}>
            <input
              type="radio"
              className="h-[1vw] w-[1vw] accent-[#A52823] max-sm:h-[4vw] max-sm:w-[4vw]"
              checked={workProofType === "SCREEN"}
              disabled={
                busy ||
                loading ||
                !!target ||
                !navigator.mediaDevices?.getDisplayMedia
              }
              onChange={() => {
                setWorkProofType("SCREEN");
                setWorkProof(null);
                keyRef.current = crypto.randomUUID();
              }}
            />
            <span>Capture layar laptop</span>
          </label>
        </div>
        <p className="text-sm text-slate-600">
          Capture layar dapat memuat informasi pribadi atau rahasia. Tutup
          konten yang tidak perlu sebelum membagikan layar.
        </p>
        {target === "workProof" ? (
          <div className="grid gap-3">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-h-[32vw] w-full rounded-xl bg-slate-950 object-contain"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => void captureFrame()}
              >
                Ambil bukti kerja
              </Button>
              <button type="button" onClick={stopStream}>
                Batal capture
              </button>
            </div>
          </div>
        ) : workProof ? (
          <div className="grid gap-2">
            <img
              src={proofUrl}
              alt="Bukti area kerja yang telah dicapture"
              className="max-h-[28vw] rounded-xl object-contain"
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={busy || loading}
              onClick={() => void startCapture("workProof")}
            >
              Ambil ulang bukti kerja
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={busy || loading || !!target}
            onClick={() => void startCapture("workProof")}
          >
            Mulai capture bukti kerja
          </Button>
        )}
      </fieldset>

      <fieldset className="grid gap-[1vw] rounded-2xl border border-[#A52823]/40 bg-[#FFF9F8] p-[1.2vw] shadow-sm max-sm:gap-[3vw] max-sm:p-[4vw]">
        <legend className="px-2 font-semibold text-[#A52823]">Selfie karyawan</legend>
        <p className="text-sm text-slate-600">
          Gunakan kamera depan. Foto hanya menjadi bukti visual untuk ditinjau
          HRD, bukan verifikasi identitas otomatis.
        </p>
        {target === "selfie" ? (
          <div className="grid gap-3">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="max-h-[32vw] w-full rounded-xl bg-slate-950 object-contain"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="primary"
                onClick={() => void captureFrame()}
              >
                Ambil selfie
              </button>
              <button type="button" onClick={stopStream}>
                Batal capture
              </button>
            </div>
          </div>
        ) : selfie ? (
          <div className="grid gap-2">
            <img
              src={selfieUrl}
              alt="Selfie yang telah dicapture"
              className="max-h-[28vw] rounded-xl object-contain"
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={busy || loading}
              onClick={() => void startCapture("selfie")}
            >
              Ambil ulang selfie
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={busy || loading || !!target}
            onClick={() => void startCapture("selfie")}
          >
            Buka kamera depan
          </Button>
        )}
      </fieldset>

      <p className="text-sm text-slate-600">
        Timestamp pada gambar memakai jam perangkat. Timestamp
        check-in/check-out resmi dicatat terpisah oleh server.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={onCancel}>
          Kembali
        </button>
        <button
          type="submit"
          className="primary"
          disabled={busy || loading || !!target || !workProof || !selfie}
        >
          {busy
            ? "Menyimpan…"
            : phase === "CHECKIN"
              ? "Kirim check-in"
              : "Kirim check-out"}
        </button>
      </div>
    </form>
  );
}
