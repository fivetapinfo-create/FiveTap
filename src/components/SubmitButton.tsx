"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pending,
  className = "btn btn-dark",
  disabled = false,
}: {
  children: React.ReactNode;
  pending?: string;
  className?: string;
  disabled?: boolean;
}) {
  const status = useFormStatus();
  return (
    <button type="submit" className={className} disabled={disabled || status.pending}>
      {status.pending && pending ? pending : children}
    </button>
  );
}
