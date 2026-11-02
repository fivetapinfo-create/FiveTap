"use client";

import { useState } from "react";

const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

/** Password field with an eye to show or hide what was typed. */
export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [shown, setShown] = useState(false);
  return (
    <div className="reveal">
      <input {...props} className="input" type={shown ? "text" : "password"} />
      <button type="button" className="reveal-eye" onClick={() => setShown((v) => !v)} aria-label={shown ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={shown}>
        <Eye off={shown} />
      </button>
    </div>
  );
}

/** A private value (like the owner's access link), hidden until the eye is tapped, with a copy button. */
export function SecretValue({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="secret">
      <code className="secret-value">{shown ? value : "•".repeat(Math.min(28, value.length))}</code>
      <button type="button" className="reveal-eye" onClick={() => setShown((v) => !v)} aria-label={shown ? "Ocultar" : "Mostrar"} aria-pressed={shown}>
        <Eye off={shown} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
      >
        {copied ? "Copiado ✓" : label}
      </button>
    </div>
  );
}
