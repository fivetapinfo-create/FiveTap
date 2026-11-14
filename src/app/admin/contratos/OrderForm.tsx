"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { PLAN_TEST_PRODUCTS, type PlanTestProduct } from "@/lib/test-kit";

type Biz = { id: string; name: string; contact: string };
const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Plan Test: a one-time sale. The total is quantity × unit price, shown live and recomputed on the server. */
export function OrderForm({ businesses, methods, today, action }: { businesses: Biz[]; methods: string[]; today: string; action: (f: FormData) => Promise<void> }) {
  const [product, setProduct] = useState<PlanTestProduct>("plaque");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState<number>(PLAN_TEST_PRODUCTS.plaque.unit);
  const [biz, setBiz] = useState("");
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState("yappy");
  const total = Math.round((Number(qty) || 0) * (Number(unit) || 0) * 100) / 100;
  const contact = businesses.find((b) => b.id === biz)?.contact ?? "";

  return (
    <form action={action} className="form-section order-form">
      <div className="order-products" role="radiogroup" aria-label="Producto">
        {(Object.keys(PLAN_TEST_PRODUCTS) as PlanTestProduct[]).map((k) => (
          <label key={k} className={`order-product${product === k ? " on" : ""}`}>
            <input type="radio" name="product" value={k} checked={product === k} onChange={() => { setProduct(k); setUnit(PLAN_TEST_PRODUCTS[k].unit); }} />
            <b>{PLAN_TEST_PRODUCTS[k].name}</b>
            <span className="num">${PLAN_TEST_PRODUCTS[k].unit} c/u</span>
          </label>
        ))}
      </div>
      <div className="grid-2">
        <label className="field">
          <span>Negocio</span>
          <select className="select" name="business_id" required value={biz} onChange={(e) => setBiz(e.target.value)}>
            <option value="" disabled>Elige el negocio</option>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Cliente o responsable</span>
          <input className="input" name="customer_name" maxLength={100} placeholder={contact || "Nombre y apellido"} key={biz} defaultValue={contact} />
        </label>
        <label className="field">
          <span>Cantidad de piezas</span>
          <input className="input" type="number" name="quantity" min={1} max={500} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} required />
        </label>
        <label className="field">
          <span>Precio unitario (USD)</span>
          <input className="input" type="number" name="unit_price" min={1} step="0.01" value={unit} onChange={(e) => setUnit(Number(e.target.value))} required />
        </label>
        <label className="field">
          <span>Fecha de compra</span>
          <input className="input" type="date" name="purchased_on" defaultValue={today} required />
        </label>
        <label className="field">
          <span>Método de pago</span>
          <select className="select" name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="yappy">Yappy</option>
            <option value="cash">Efectivo</option>
            <option value="ach">Transferencia bancaria</option>
            <option value="card">Tarjeta</option>
            <option value="paypal">PayPal</option>
            {methods.map((m) => <option key={m} value={`m:${m}`}>{m}</option>)}
            <option value="other">Otro</option>
          </select>
        </label>
        {method === "other" && (
          <label className="field">
            <span>¿Cuál método?</span>
            <input className="input" name="method_other" maxLength={40} required placeholder="Ej. Cheque" />
          </label>
        )}
        <label className="field">
          <span>Estado del pago</span>
          <select className="select" name="pay_status" value={paid ? "paid" : "pending"} onChange={(e) => setPaid(e.target.value === "paid")}>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Observaciones</span>
        <input className="input" name="notes" maxLength={500} placeholder="Ej. entrega el viernes, color negro" />
      </label>
      <div className="order-total">
        <span>{qty} × {usd(Number(unit) || 0)}</span>
        <b className="num">Total {usd(total)}</b>
      </div>
      <label className="check"><input type="checkbox" name="create_pieces" value="1" defaultChecked /> Crear las {qty} {qty === 1 ? "pieza" : "piezas"} en el inventario de Placas, con su enlace para grabar.</label>
      {paid && <label className="check"><input type="checkbox" name="send" value="1" defaultChecked /> Enviar el recibo al cliente (correo y app FiveTap Business).</label>}
      <p className="muted" style={{ fontSize: 13 }}>Es una compra única: no crea mensualidades ni pausa nada. {paid ? "Al guardar se registra el pago y se emite su recibo." : "Cuando pague, márcala como pagada en la lista y se emite su recibo."}</p>
      <SubmitButton className="btn btn-dark" pending="Guardando…">{paid ? `Registrar compra y emitir recibo · ${usd(total)}` : "Registrar compra pendiente"}</SubmitButton>
    </form>
  );
}
