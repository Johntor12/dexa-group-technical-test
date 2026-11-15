import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function Button({
  variant = "secondary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const color =
    variant === "primary"
      ? "primary"
      : variant === "danger"
        ? "border-[#a52029] text-[#a52029]"
        : "";
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${color} min-h-[3.05vw] min-w-[3.05vw] max-md:min-h-11 max-md:min-w-11 ${className}`}
    >
      {loading ? "Memproses…" : children}
    </button>
  );
}
