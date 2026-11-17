import { useState } from 'react';
import type { InputHTMLAttributes } from 'react';

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

export function PasswordField({ label, id, className = '', ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="grid gap-[0.4vw]">
      <label htmlFor={fieldId}>{label}</label>
      <span className="relative block">
        <input
          {...inputProps}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className={`w-full pr-[3vw] max-sm:pr-[11vw] ${className}`}
        />
        <button
          type="button"
          className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 !border-0 !bg-transparent !px-0 !py-0 text-slate-500 shadow-none hover:text-[#A52823] hover:!bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A52823] max-sm:right-[2.5vw]"
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          aria-pressed={visible}
          aria-controls={fieldId}
          disabled={inputProps.disabled}
          onClick={() => setVisible((current) => !current)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[1.15vw] w-[1.15vw] max-sm:h-[5vw] max-sm:w-[5vw]"
          >
            {visible ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                <path d="M9.9 5.2A10.7 10.7 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2-2.2 2.9" />
                <path d="M6.2 6.2C3.8 7.7 2.7 10 2.5 12c.4 1.1 1.3 2.4 2.8 3.6A10.5 10.5 0 0012 19c1.1 0 2.1-.2 3-.5" />
              </>
            ) : (
              <>
                <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                <circle cx="12" cy="12" r="2.5" />
              </>
            )}
          </svg>
        </button>
      </span>
    </div>
  );
}
