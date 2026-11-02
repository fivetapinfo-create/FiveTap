"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn btn-dark btn-sm" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
