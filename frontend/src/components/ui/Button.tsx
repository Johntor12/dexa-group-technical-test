import { memo } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export const Button = memo(function Button({
  variant = "secondary",
  size = "md",
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
  const sizeClass =
    size === "sm"
      ? "min-h-[2.8vw] min-w-[7vw] px-[0.9vw] py-[0.55vw] text-[clamp(0.82rem,0.95vw,0.95rem)] max-md:min-h-[11vw] max-md:min-w-[11vw] max-md:px-[3vw] max-md:py-[2vw] max-md:text-[3.6vw]"
      : size === "lg"
        ? "min-h-[3.4vw] px-[1.4vw] py-[0.85vw] text-[clamp(0.95rem,1.1vw,1.1rem)] max-md:min-h-[12vw] max-md:px-[4vw] max-md:py-[3vw] max-md:text-[4vw]"
        : "min-h-[3.05vw] min-w-[3.05vw] max-md:min-h-[11vw] max-md:min-w-[11vw]";
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${color} ${sizeClass} ${className}`}
    >
      {loading ? "Memproses…" : children}
    </button>
  );
});
