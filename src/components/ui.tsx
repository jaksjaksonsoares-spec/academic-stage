"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Icon } from "./icon";

import { buttonPrimary } from "./styles";
export { buttonPrimary, buttonSecondary } from "./styles";

export function SubmitButton({ children, pendingText, className = buttonPrimary }: { children: ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <span className="spinner inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({ status, message }: { status: "idle" | "success" | "error"; message?: string }) {
  if (!message || status === "idle") return null;
  const ok = status === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex gap-3 rounded-[var(--radius-control)] border-l-4 p-4 text-[0.97rem] ${
        ok
          ? "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_10%,var(--surface))]"
          : "border-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_9%,var(--surface))]"
      }`}
    >
      <Icon name={ok ? "check" : "alert"} className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-[var(--muted)]">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${name}-error`} className="text-sm font-bold text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Atributos ARIA para um input ligado ao seu rótulo, dica e erro. */
export function describedBy(name: string, error?: string, hint?: string) {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(" ");
  return {
    id: name,
    name,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": ids || undefined,
  };
}
