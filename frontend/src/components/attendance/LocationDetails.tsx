import type { Attendance } from "../../lib/api";

export function LocationDetails({ attendance }: { attendance: Attendance }) {
  const { latitude, longitude, locationAccuracy } = attendance;
  if (latitude === null || longitude === null)
    return <p className="muted">Lokasi tidak tersedia untuk catatan ini.</p>;
  const mapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  return (
    <div className="grid gap-[0.4vw]">
      <strong>Lokasi WFH</strong>
      <p>
        Koordinat perangkat: {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </p>
      {locationAccuracy !== null && (
        <p className="small muted">
          Perkiraan akurasi ±{Math.round(locationAccuracy)} meter
        </p>
      )}
      <a
        href={mapUrl}
        target="_blank"
        rel="noreferrer"
        className="text-dexa-red underline"
      >
        Buka lokasi di peta
      </a>
    </div>
  );
}
