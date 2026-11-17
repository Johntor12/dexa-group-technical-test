import { useState } from "react";

export interface WfhLocation {
  latitude: number;
  longitude: number;
  locationAccuracy: number;
}

export function LocationCapture({
  location,
  disabled,
  onChange,
  onError,
}: {
  location: WfhLocation | null;
  disabled: boolean;
  onChange: (location: WfhLocation) => void;
  onError: (message: string) => void;
}) {
  const [locating, setLocating] = useState(false);
  function requestLocation() {
    if (!navigator.geolocation) {
      onError(
        "Browser ini tidak mendukung lokasi. Gunakan browser dengan izin lokasi aktif.",
      );
      return;
    }
    setLocating(true);
    onError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationAccuracy: position.coords.accuracy,
        });
        setLocating(false);
      },
      (error) => {
        onError(
          error.code === 1
            ? "Izin lokasi ditolak. Izinkan akses lokasi pada browser lalu coba lagi."
            : "Lokasi belum dapat diperoleh. Periksa layanan lokasi perangkat lalu coba lagi.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  return (
    <div className="grid gap-[0.7vw] rounded-lg border border-dexa-border p-[1vw]">
      <strong>Lokasi WFH saat absensi</strong>
      <p className="small muted">
        Lokasi diambil sekali setelah Anda memberi izin dan disimpan bersama
        absensi. HRD dapat melihat koordinat dan akurasinya; aplikasi tidak
        melacak lokasi Anda terus-menerus.
      </p>
      <button
        type="button"
        disabled={disabled || locating}
        onClick={requestLocation}
        className="justify-self-start"
      >
        {locating
          ? "Mengambil lokasi..."
          : location
            ? "Perbarui lokasi"
            : "Izinkan dan ambil lokasi"}
      </button>
      {location && (
        <p role="status" className="small">
          Lokasi siap: {location.latitude.toFixed(5)},{" "}
          {location.longitude.toFixed(5)} (akurasi ±
          {Math.round(location.locationAccuracy)} m)
        </p>
      )}
    </div>
  );
}
