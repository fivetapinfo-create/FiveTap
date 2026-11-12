import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessLogo } from "@/components/BusinessLogo";
import { CopyButton } from "@/components/CopyButton";
import { accessCodes } from "@/lib/access";
import { db } from "@/lib/supabase";
import { installQrSvg, installUrl } from "@/lib/install-qr";
import type { Business } from "@/lib/types";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ para?: string }> };

const WHO = {
  dueno: { label: "Dueño/a", gets: "Todo: reseñas, quejas al instante, resumen diario y recordatorios de pago." },
  gerente: { label: "Gerente · supervisor/a · encargado/a", gets: "Reseñas, quejas al instante y resumen diario. Sin recordatorios de pago." },
} as const;

/** Shown on the founder's phone at the venue: the owner scans it and installs in 30 seconds. */
export default async function InstallQr({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { data } = await db().from("businesses").select("id, name, logo_url, brand_color, owner_token, owner_code_enc, manager_code_enc").eq("id", id).maybeSingle();
  const b = data as Pick<Business, "id" | "name" | "logo_url" | "brand_color" | "owner_token" | "owner_code_enc" | "manager_code_enc"> | null;
  if (!b) notFound();
  const para = sp.para === "gerente" ? "gerente" : "dueno";
  const url = installUrl(b.owner_token, para);
  const svg = await installQrSvg(url);
  const codes = await accessCodes(b);

  return (
    <main className="container admin-main install-qr">
      <Link className="crumb" href={`/admin/b/${b.id}#app`}>← {b.name}</Link>
      <div className="seg install-seg" role="tablist">
        {(Object.keys(WHO) as (keyof typeof WHO)[]).map((k) => (
          <Link key={k} href={`?para=${k}`} replace role="tab" aria-selected={k === para}>{WHO[k].label}</Link>
        ))}
      </div>
      <section className="panel install-card">
        <div className="biz" style={{ justifyContent: "center" }}>
          <BusinessLogo name={b.name} logoUrl={b.logo_url} color={b.brand_color} className="biz-logo" />
          <b>{b.name}</b>
        </div>
        <p className="install-title">Escanea con la cámara</p>
        <div className="install-code" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="muted">{WHO[para].gets}</p>
        <p className="install-access">Código de acceso: <b className="num">{para === "gerente" ? codes.manager : codes.owner}</b></p>
        <small className="muted">Díctaselo o escríbelo tú en su celular. El código no va en la tarjeta: sin él nadie entra aunque tenga el QR.</small>
        <div className="row" style={{ justifyContent: "center" }}>
          <a className="btn btn-dark btn-sm" href={`/admin/b/${b.id}/instalar/tarjeta?para=${para}&dl=1`}>Descargar tarjeta con QR</a>
          <a className="btn btn-ghost btn-sm" href={`/admin/b/${b.id}/instalar/tarjeta?para=${para}`} target="_blank" rel="noreferrer">Ver tarjeta</a>
        </div>
        <small className="muted">La tarjeta es una imagen para enviar por WhatsApp o imprimir. Es el acceso privado del local: no la publiques.</small>
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Qué decirle (30 segundos)</h2></div>
        <ol className="owner-how">
          <li>“Abre la <b>cámara</b> y apunta aquí.” Toca el enlace que aparece.</li>
          <li><b>iPhone:</b> “Toca <b>Compartir</b> abajo → <b>Agregar a pantalla de inicio</b>.” <b>Android:</b> “Toca <b>Instalar FiveTap</b>.”</li>
          <li>“Escribe tu <b>código de acceso</b>” (el de arriba). Solo se pide una vez en ese celular.</li>
          <li>“Abre <b>FiveTap</b> desde el ícono blanco y toca <b>Activar avisos</b> → <b>Permitir</b>.” Le llega “¡Listo!” al instante.</li>
        </ol>
        <div className="msg">
          <div className="row">
            <CopyButton value={url} label="Copiar enlace de instalación" />
          </div>
          <small className="muted">Tu app es negra (panel de fundador). La del local es blanca y solo ve su negocio.</small>
        </div>
      </section>
    </main>
  );
}
