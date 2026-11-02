import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/SubmitButton";
import { signIn } from "./actions";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function SignIn({ searchParams }: Props) {
  const { next = "/admin", error } = await searchParams;
  return (
    <main className="container admin-main signin">
      <form action={signIn} className="panel signin-card">
        <Logo size={22} />
        <h1>Panel de FiveTap</h1>
        {error && <p className="alert alert-error" role="alert">Usuario o contraseña incorrectos.</p>}
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span>Usuario</span>
          <input className="input" name="user" autoComplete="username" autoCapitalize="none" required defaultValue="admin" />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input className="input" name="password" type="password" autoComplete="current-password" required autoFocus />
        </label>
        <SubmitButton className="btn btn-dark" pending="Entrando…">Entrar</SubmitButton>
        <small className="muted">Queda abierto en este celular por 6 meses.</small>
      </form>
    </main>
  );
}
