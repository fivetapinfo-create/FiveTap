"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Brings in what is new (messages, ratings, alerts) without leaving the app. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [spin, setSpin] = useState(false);
  return (
    <button
      type="button"
      className={`refresh-btn${pending || spin ? " spinning" : ""}`}
      aria-label="Actualizar"
      title="Actualizar"
      onClick={() => { setSpin(true); start(() => router.refresh()); setTimeout(() => setSpin(false), 900); }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
