const OK: Record<string, string> = {
  creado: "Negocio creado. Graba cada enlace en su placa NFC con NFC Tools.",
  guardado: "Cambios guardados.",
  placas: "Placas nuevas generadas.",
  pago: "Pago registrado y comprobante emitido.",
  "pago-reactivado": "Pago registrado y comprobante emitido. Sus placas y su app ya funcionan otra vez.",
  "comprobante-correo": "Pago registrado. Comprobante emitido y enviado al correo del dueño y a su app.",
  "comprobante-app": "Pago registrado y comprobante emitido. Se envió a su app; el correo no salió (mira el detalle en Comprobantes).",
  "comprobante-correo-reactivado": "Pago registrado y comprobante enviado por correo y a su app. Sus placas ya funcionan otra vez.",
  "comprobante-app-reactivado": "Pago registrado y comprobante enviado a su app (el correo no salió). Sus placas ya funcionan otra vez.",
  "comprobante-emitido": "Comprobante emitido.",
  reenviado: "Comprobante reenviado por correo y a su app.",
  "reenviado-sin-correo": "Comprobante reenviado a su app. El correo no salió: mira el detalle en el historial de envíos.",
  anulado: "Pago anulado. Su comprobante quedó marcado como anulado y el cambio se guardó en el historial.",
  metodo: "Métodos de pago actualizados.",
  plazo: "Plazo extendido: sus placas siguen funcionando hasta la nueva fecha.",
  eliminado: "Negocio eliminado.",
  empresa: "Datos de la empresa guardados.",
  fundador: "Fundadores actualizados.",
  documento: "Documentos actualizados.",
  resenas: "Conteo de reseñas guardado.",
  push: "Notificación de prueba enviada. Revisa el celular.",
  enlace: "Enlace privado cambiado. Reenvía el acceso al dueño y al gerente.",
};

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="alert alert-error" role="alert">{error}</p>;
  if (ok && OK[ok]) return <p className="alert alert-ok">{OK[ok]}</p>;
  return null;
}
