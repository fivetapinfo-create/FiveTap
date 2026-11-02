import type { Copy } from "@/lib/i18n";
import { LogoMark } from "@/components/Logo";

export function Inactive({ copy }: { copy: Copy }) {
  return (
    <main className="guest">
      <div className="guest-wrap" style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 12 }}>
        <LogoMark size={36} className="rise" />
        <h1 className="guest-title rise" style={{ "--i": 1 } as React.CSSProperties}>{copy.inactiveTitle}</h1>
        <p className="guest-lead rise" style={{ "--i": 2 } as React.CSSProperties}>{copy.inactiveBody}</p>
      </div>
    </main>
  );
}
