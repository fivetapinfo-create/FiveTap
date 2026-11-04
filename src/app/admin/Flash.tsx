const OK: Record<string, string> = {
  creado: "Negocio creado. Graba cada enlace en su placa NFC con NFC Tools.",
  guardado: "Cambios guardados.",
  placas: "Placas nuevas generadas.",
  pago: "Pago registrado.",
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
