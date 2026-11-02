/* eslint-disable @next/next/no-img-element -- remote logos, tiny, no optimizer needed */
import { initials, onColor, safeColor } from "@/lib/brand";

export function BusinessLogo({
  name,
  logoUrl,
  color,
  className = "guest-logo",
}: {
  name: string;
  logoUrl: string | null;
  color: string;
  className?: string;
}) {
  const bg = safeColor(color);
  if (logoUrl) {
    return (
      <div className={className}>
        <img src={logoUrl} alt={name} />
      </div>
    );
  }
  return (
    <div className={className} style={{ background: bg, color: onColor(bg) }} aria-label={name}>
      {initials(name)}
    </div>
  );
}
