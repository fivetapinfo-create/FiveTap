import Link from "next/link";
import { ContractForm } from "./ContractForm";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NewContract({ searchParams }: Props) {
  const { error } = await searchParams;
  const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  return (
    <main className="container admin-main" style={{ maxWidth: 820 }}>
      <div>
        <Link className="crumb" href="/admin/contratos">← Contratos</Link>
        <div className="admin-head" style={{ marginTop: 8 }}>
          <div>
            <h1>Nuevo contrato</h1>
            <p>Toca las opciones, escribe lo mínimo y se genera el PDF listo para firmar.</p>
          </div>
        </div>
      </div>
      <ContractForm today={today} error={error} />
    </main>
  );
}
