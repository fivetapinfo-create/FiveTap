"use client";

import { useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";

type Props = {
  id: string;
  name: string;
  /** Pieces the client has in the venue: they stop working when the business is deleted. */
  delivered: number;
  counts: { pieces: number; contacts: number; payments: number; receipts: number };
  action: (f: FormData) => Promise<void>;
};

/**
 * "Opciones" menu of a business with the safe delete: a first window that says what is
 * erased and what is kept, then a second one where the founder types the exact name.
 * The server checks the name again; nothing is erased until both steps are done.
 */
export function BusinessOptions({ id, name, delivered, counts, action }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const [retired, setRetired] = useState(false);

  const open = () => {
    menu.current?.removeAttribute("open");
    setStep(1);
    setTyped("");
    setRetired(false);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const ready = typed.trim() === name && (delivered === 0 || retired);

  return (
    <>
      <details className="opts-menu" ref={menu}>
        <summary className="btn btn-ghost btn-sm" aria-label="Opciones del negocio">Opciones ⋯</summary>
        <div className="opts-list" role="menu">
          <a role="menuitem" href="#datos" onClick={() => { menu.current?.removeAttribute("open"); (document.getElementById("datos") as HTMLDetailsElement | null)?.setAttribute("open", ""); }}>Editar datos</a>
          <a role="menuitem" href="#pagos" onClick={() => menu.current?.removeAttribute("open")}>Registrar pago</a>
          <button role="menuitem" type="button" className="danger" onClick={open}>Eliminar negocio</button>
        </div>
      </details>

      <dialog ref={dialog} className="confirm-dialog" aria-labelledby="del-title" onClose={() => setStep(1)}>
        {step === 1 ? (
          <div className="confirm-body">
            <h2 id="del-title">¿Eliminar {name}?</h2>
            <p className="confirm-warn">Esta acción es permanente y no se puede deshacer.</p>
            <div className="confirm-cols">
              <div>
                <b>Se borra</b>
                <ul>
                  <li>{counts.pieces} {counts.pieces === 1 ? "placa o tarjeta" : "placas y tarjetas"} (sus enlaces dejan de funcionar)</li>
                  <li>Toques, estadísticas y conteos de reseñas</li>
                  <li>Mensajes de clientes</li>
                  <li>Club: {counts.contacts} {counts.contacts === 1 ? "contacto" : "contactos"}</li>
                  <li>Accesos y avisos de su app FiveTap Business</li>
                </ul>
              </div>
              <div>
                <b>Se conserva</b>
                <ul>
                  <li>{counts.payments} {counts.payments === 1 ? "pago" : "pagos"} y {counts.receipts} {counts.receipts === 1 ? "recibo" : "recibos"}, con el nombre del negocio</li>
                  <li>Compras del Plan Test y contratos firmados</li>
                  <li>El historial de cambios</li>
                </ul>
              </div>
            </div>
            {delivered > 0 && (
              <p className="alert alert-warn">Tiene {delivered} {delivered === 1 ? "pieza entregada" : "piezas entregadas"} en el local. Al eliminarlo, dejarán de funcionar.</p>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={close} autoFocus>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={() => setStep(2)}>Continuar</button>
            </div>
          </div>
        ) : (
          <form action={action} className="confirm-body danger-zone">
            <input type="hidden" name="id" value={id} />
            <h2 id="del-title">Confirmación final</h2>
            <label className="field">
              <span>Escribe <b>{name}</b> para eliminarlo</span>
              <input className="input" name="confirm" autoComplete="off" required value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
            </label>
            {delivered > 0 && (
              <label className="check">
                <input type="checkbox" name="retire_delivered" value="1" checked={retired} onChange={(e) => setRetired(e.target.checked)} />
                <span>Entiendo que sus {delivered} {delivered === 1 ? "pieza entregada dejará" : "piezas entregadas dejarán"} de funcionar.</span>
              </label>
            )}
            <div className="confirm-actions">
              <button type="button" className="btn btn-ghost" onClick={close}>Cancelar</button>
              <SubmitButton className="btn btn-danger" pending="Eliminando…" disabled={!ready}>Eliminar para siempre</SubmitButton>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
