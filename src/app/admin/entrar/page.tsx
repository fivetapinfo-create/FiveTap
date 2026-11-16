import { FounderIntro } from "@/components/FounderIntro";
import { MARK_PATH } from "@/components/Logo";
import { PasskeyLogin } from "@/components/PasskeyButtons";
import { PasswordInput } from "@/components/RevealInput";
import { SubmitButton } from "@/components/SubmitButton";
import { listPasskeys, passkeyOnly, relyingParty } from "@/lib/passkeys";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string; error?: string; bloqueado?: string }> };

/** The founder's door: the entrance animation, then Face ID (or fingerprint) first, password as the alternative. */
export default async function SignIn({ searchParams }: Props) {
  const { next = "/admin", error, bloqueado } = await searchParams;
  const locked = bloqueado === "1";
  const safeNext = next.startsWith("/admin") && !next.startsWith("/admin/entrar") ? next : "/admin";
  const [{ rpID }, only] = await Promise.all([relyingParty(), passkeyOnly().catch(() => false)]);
  const hasKeys = (await listPasskeys(rpID).catch(() => [])).length > 0;
  const passwordForm = (
    <form action={signIn}>
      {error && <p className="alert alert-error" role="alert">{only ? "Contraseña de respaldo incorrecta." : "Usuario o contraseña incorrectos."}</p>}
      <input type="hidden" name="next" value={safeNext} />
      <label className="field">
        <span>Usuario</span>
        <input className="input" name="user" autoComplete="username" autoCapitalize="none" required defaultValue="admin" />
      </label>
      <label className="field">
        <span>{only ? "Contraseña de respaldo (emergencia)" : "Contraseña"}</span>
        <PasswordInput name="password" autoComplete="current-password" required autoFocus={!hasKeys} />
      </label>
      <SubmitButton className="btn btn-dark btn-block" pending="Entrando…">Entrar</SubmitButton>
    </form>
  );
  return (
    <main className="fs">
      <FounderIntro />
      <div className="fs-card">
        <div className="fs-brand">
          <svg viewBox="0 0 100 100" aria-hidden="true"><path d={MARK_PATH} /></svg>
          <h1>FiveTap Founder</h1>
          <p>{locked && hasKeys ? "Tu panel se bloqueó. Desbloquéalo con Face ID." : "Acceso privado del fundador"}</p>
        </div>
        {hasKeys && <PasskeyLogin next={safeNext} auto />}
        {hasKeys ? (
          <details className="fs-alt" open={Boolean(error)}>
            <summary>{only ? "¿Perdiste tu dispositivo? Usa la contraseña de respaldo" : "Entrar con usuario y contraseña"}</summary>
            {passwordForm}
          </details>
        ) : passwordForm}
        <small>{hasKeys ? "Solo tus dispositivos registrados pueden abrir este panel." : "Después de entrar, activa Face ID en Más → Seguridad."}</small>
      </div>
    </main>
  );
}
