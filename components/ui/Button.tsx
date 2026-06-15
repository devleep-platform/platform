import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
    variant === "primary" &&
      "border-brand-600 bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600",
    variant === "secondary" &&
      "border-line bg-white text-ink hover:bg-slate-50 focus-visible:outline-brand-600",
    variant === "ghost" &&
      "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-brand-600",
    variant === "danger" &&
      "border-red-200 bg-red-50 text-danger hover:bg-red-100 focus-visible:outline-danger",
    size === "sm" && "h-8 px-3 text-sm",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-11 px-5 text-base",
    className
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  type = "button",
  ...props
}: ButtonProps) {
  const classes = buttonClassName({ variant, size, className });

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
