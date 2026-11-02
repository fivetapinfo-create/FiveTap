"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import {
  ADDRESS_KINDS,
  PAY_METHODS,
  PLANS,
  type PlanKey,
  SECTORS,
  SIGNER_ROLES,
  TRIAL_DAYS,
  TRIAL_MODES,
  type TrialMode,
  VENUE_KINDS,
  WAITER_CARD_PRICE,
  longDate,
  money,
} from "@/lib/contract";
import { createContract } from "../actions";

/** One tap choices instead of typing: a row of pill buttons backed by radio inputs. */
function Chips({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="chips-pick" role="radiogroup">
      {options.map((o) => (
        <label key={o} className={`pick${o === value ? " on" : ""}`}>
          <input type="radio" name={name} value={o} checked={o === value} onChange={() => onChange(o)} />
          {o}
        </label>
      ))}
    </div>
  );
}

function Stepper({ name, value, onChange, label }: { name: string; value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div className="row">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Menos ${label}`}>−</button>
        <input className="input num" name={name} type="number" min={0} max={200} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(value + 1)} aria-label={`Más ${label}`}>+</button>
      </div>
    </div>
  );
}

/** Shrinks any photo (camera, gallery, HEIC on iPhone) to a ≤800 px JPEG data URL. */
async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = url;
    });
    const scale = Math.min(1, 800 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const PLAN_NOTE: Record<PlanKey, string> = {
  monthly: `${money(PLANS.monthly.price)} al mes · instalación ${money(PLANS.monthly.setup)}`,
  annual: `${money(PLANS.annual.price)} al año · instalación gratis`,
  plaque: `${money(PLANS.plaque.price)} al mes por cada placa`,
};

const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export function ContractForm({ today, error }: { today: string; error?: string }) {
  const [kind, setKind] = useState<string>("Restaurante");
  const [addr, setAddr] = useState<string>("Calle");
  const [sector, setSector] = useState<string>("Parque Lefevre");
  const [role, setRole] = useState<string>("Dueño/a");
  const [plan, setPlan] = useState<PlanKey>("monthly");
  const [pay, setPay] = useState<string>("Yappy");
  const [plaques, setPlaques] = useState(10);
  const [cards, setCards] = useState(0);
  const [logo, setLogo] = useState("");
  const [business, setBusiness] = useState(true);
  const [trial, setTrial] = useState<TrialMode>("done");
  const [start, setStart] = useState(today);
  const [trialStart, setTrialStart] = useState(shift(today, -TRIAL_DAYS));

  const withBusiness = plan !== "plaque" || business;
  const fee = PLANS[plan].perPlaque ? PLANS[plan].price * Math.max(1, plaques) : PLANS[plan].price;
  const setup = PLANS[plan].setup + cards * WAITER_CARD_PRICE;
  // After a trial already done (or none), the first period is paid on the installation day.
  const total = useMemo(() => setup + (trial === "starts" ? 0 : fee), [setup, trial, fee]);

  return (
    <form action={createContract} className="panel contract-form">
      {error && <p className="alert alert-error" role="alert" style={{ margin: 20 }}>{error}</p>}

      <div className="form-section">
        <h3>1. El local</h3>
        <label className="field">
          <span>Nombre del local</span>
          <input className="input" name="venue_name" required maxLength={100} placeholder="La Terraza" autoComplete="off" />
        </label>
        <div className="field">
          <span>Tipo</span>
          <Chips name="venue_kind" options={VENUE_KINDS} value={kind} onChange={setKind} />
          {kind === "Otro" && <input className="input" name="venue_kind_other" placeholder="Ej. Pizzería" maxLength={40} />}
        </div>
        <div className="field">
          <span>Logo del local</span>
          <div className="row">
            <label className="btn btn-ghost btn-sm">
              📷 Tomar foto
              <input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setLogo(await toJpeg(f)); }} />
            </label>
            <label className="btn btn-ghost btn-sm">
              Elegir de la galería
              <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setLogo(await toJpeg(f)); }} />
            </label>
            {logo && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo del local" className="logo-preview" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogo("")}>Quitar</button>
              </>
            )}
          </div>
          <input type="hidden" name="logo_data" value={logo} />
          <small className="muted">Opcional. Sale en la esquina del contrato.</small>
        </div>
      </div>

      <div className="form-section">
        <h3>2. Dirección</h3>
        <div className="field">
          <span>Está en</span>
          <Chips name="address_kind" options={ADDRESS_KINDS} value={addr} onChange={setAddr} />
        </div>
        <div className="grid-2">
          <label className="field">
            <span>{addr === "Calle" ? "Calle" : addr === "Plaza" ? "Nombre de la plaza" : `Nombre del ${addr.toLowerCase()}`}</span>
            <input className="input" name="street" required maxLength={120} placeholder={addr === "Calle" ? "Calle 50" : "Plaza Carolina"} />
          </label>
          <label className="field">
            <span>{addr === "Calle" ? "Número" : "Local"}</span>
            <input className="input" name="number_or_local" maxLength={30} placeholder={addr === "Calle" ? "12" : "7B"} />
          </label>
        </div>
        <div className="field">
          <span>Sector</span>
          <Chips name="sector" options={[...SECTORS, "Otro"]} value={sector} onChange={setSector} />
          {sector === "Otro" && <input className="input" name="sector_other" placeholder="Ej. Clayton" maxLength={60} />}
        </div>
        <label className="field">
          <span>Ciudad</span>
          <input className="input" name="city" defaultValue="Ciudad de Panamá" maxLength={60} />
        </label>
      </div>

      <div className="form-section">
        <h3>3. Quién firma</h3>
        <label className="field">
          <span>Nombre completo</span>
          <input className="input" name="signer_name" required maxLength={100} autoComplete="off" />
        </label>
        <div className="field">
          <span>Cargo</span>
          <Chips name="signer_role" options={SIGNER_ROLES} value={role} onChange={setRole} />
        </div>
        <div className="grid-2">
          <label className="field">
            <span>Teléfono / WhatsApp</span>
            <input className="input" name="phone" type="tel" inputMode="tel" maxLength={30} placeholder="6000-0000" />
          </label>
          <label className="field">
            <span>Correo (opcional)</span>
            <input className="input" name="email" type="email" maxLength={120} placeholder="gerente@local.com" />
          </label>
        </div>
      </div>

      <div className="form-section">
        <h3>4. Tipo de mensualidad</h3>
        <div className="plan-options" role="radiogroup">
          {(Object.keys(PLANS) as PlanKey[]).map((k) => (
            <label key={k} className={`plan-option${k === plan ? " on" : ""}`}>
              <input type="radio" name="plan" value={k} checked={k === plan} onChange={() => { setPlan(k); setPlaques(k === "plaque" ? 1 : 10); }} />
              <b>{PLANS[k].label}</b>
              <span>{PLAN_NOTE[k]}</span>
            </label>
          ))}
        </div>
        {plan === "plaque" ? (
          <div className="field">
            <span>¿Incluye FiveTap Business? (la app para dueños, gerentes y encargados)</span>
            <Chips name="with_business_label" options={["Sí, con FiveTap Business", "No, solo la placa (directo a Google)"]} value={business ? "Sí, con FiveTap Business" : "No, solo la placa (directo a Google)"} onChange={(v) => setBusiness(v.startsWith("Sí"))} />
            <input type="hidden" name="with_business" value={business ? "si" : "no"} />
          </div>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>Incluye FiveTap Business, la app para dueños, gerentes y encargados.</p>
        )}
      </div>

      <div className="form-section">
        <h3>5. Prueba gratis</h3>
        <Chips name="trial_mode_label" options={Object.values(TRIAL_MODES)} value={TRIAL_MODES[trial]} onChange={(v) => setTrial((Object.keys(TRIAL_MODES) as TrialMode[]).find((k) => TRIAL_MODES[k] === v) ?? "done")} />
        <input type="hidden" name="trial_mode" value={trial} />
        {trial === "done" && (
          <label className="field" style={{ maxWidth: 240 }}>
            <span>La prueba empezó el</span>
            <input className="input" type="date" name="trial_start" value={trialStart} max={shift(start, -1)} onChange={(e) => setTrialStart(e.target.value)} required />
            <small className="muted">Terminó el {longDate(shift(trialStart, TRIAL_DAYS - 1))}. El plan empieza el día de la instalación.</small>
          </label>
        )}
        {trial === "starts" && <small className="muted">7 días sin cobro desde la fecha de inicio. El plan se cobra el día 8.</small>}
      </div>

      <div className="form-section">
        <h3>6. Piezas y pago</h3>
        <div className="grid-2">
          <Stepper name="plaques" label="Placas clásicas (12 × 12 cm)" value={plaques} onChange={setPlaques} />
          <Stepper name="waiter_cards" label={`Tarjetas meseros (${money(WAITER_CARD_PRICE)} c/u)`} value={cards} onChange={setCards} />
        </div>
        <div className="field">
          <span>Forma de pago</span>
          <Chips name="payment_method" options={PAY_METHODS} value={pay} onChange={setPay} />
        </div>
        <label className="field" style={{ maxWidth: 240 }}>
          <span>Fecha de inicio (instalación)</span>
          <input className="input" type="date" name="start_date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <div className="contract-summary">
          <div><span>Mensualidad</span><b>{PLANS[plan].label}</b></div>
          <div><span>Precio</span><b className="num">{money(fee)} / {PLANS[plan].every}{PLANS[plan].perPlaque ? ` (${Math.max(1, plaques)} × ${money(PLANS[plan].price)})` : ""}</b></div>
          <div><span>FiveTap Business</span><b>{withBusiness ? "Incluido" : "No incluido"}</b></div>
          <div><span>Prueba gratis</span><b>{TRIAL_MODES[trial]}</b></div>
          <div><span>Se paga el día de la instalación</span><b className="num">{money(total)}</b></div>
          <div><span>Después</span><b className="num">{money(fee)} cada {PLANS[plan].every}</b></div>
        </div>
        <SubmitButton className="btn btn-dark" pending="Generando…">Generar contrato</SubmitButton>
      </div>
    </form>
  );
}
