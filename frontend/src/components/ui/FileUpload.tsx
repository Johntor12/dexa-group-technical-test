import { useEffect, useRef, useState } from "react";

interface FileUploadProps {
  file: File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}

export function FileUpload({
  file,
  disabled,
  onChange,
  onError,
}: FileUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function choose(selected: File | null) {
    onError("");
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      onError("Gunakan foto JPG, PNG, atau WebP.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      onError("Ukuran foto maksimal 5 MiB.");
      return;
    }
    setPreview(URL.createObjectURL(selected));
    onChange(selected);
  }

  return (
    <div className="grid gap-[1vw]">
      <label htmlFor="wfh-photo">
        Foto bukti WFH
        <input
          ref={input}
          id="wfh-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
        />
      </label>
      {file && preview ? (
        <div className="grid gap-[1vw]">
          <img
            src={preview}
            alt="Pratinjau foto bukti kerja yang dipilih"
            className="max-h-[17vw] w-full rounded-[0.8vw] border border-dexa-border object-contain max-md:max-h-[50vw]"
          />
          <p className="small muted">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MiB · Siap
            dikirim
          </p>
          <div className="flex gap-[1vw]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => input.current?.click()}
            >
              Ganti foto
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (input.current) input.current.value = "";
                onChange(null);
              }}
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          className="grid min-h-[12vw] place-content-center gap-[0.5vw] border-dashed text-center max-md:min-h-[40vw]"
          onClick={() => input.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!disabled) choose(event.dataTransfer.files[0] ?? null);
          }}
        >
          <span aria-hidden="true" className="text-[clamp(2rem,3vw,3rem)]">
            ↑
          </span>
          <span>Tarik foto ke sini atau pilih dari perangkat</span>
        </button>
      )}
      <p className="small muted">
        JPG, PNG, atau WebP · Maks. 5 MiB. Waktu dicatat otomatis saat dikirim.
      </p>
    </div>
  );
}
