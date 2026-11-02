import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="pay" style={{ textAlign: "center", justifyItems: "center", paddingTop: 96 }}>
      <Logo />
      <h1 style={{ fontSize: 28, fontWeight: 720, marginTop: 16 }}>Página no encontrada</h1>
      <Link className="btn btn-dark" href="/">Ir al inicio</Link>
    </main>
  );
}
