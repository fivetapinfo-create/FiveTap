// Acceptance marks for the pay page. Plain SVG so they render crisp and load instantly.

const Badge = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <span className="pm-badge" role="img" aria-label={label}>
    <svg viewBox="0 0 60 38" width="60" height="38" aria-hidden="true">
      <rect x="0.5" y="0.5" width="59" height="37" rx="7" fill="#fff" stroke="#e3e2dd" />
      {children}
    </svg>
  </span>
);

export const Visa = () => (
  <Badge label="Visa">
    <text x="30" y="25" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="15" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="0.5">VISA</text>
  </Badge>
);

export const Mastercard = () => (
  <Badge label="Mastercard">
    <circle cx="24.5" cy="19" r="9" fill="#EB001B" />
    <circle cx="35.5" cy="19" r="9" fill="#F79E1B" />
    <path d="M30 11.9a9 9 0 0 1 0 14.2 9 9 0 0 1 0-14.2z" fill="#FF5F00" />
  </Badge>
);

export const Amex = () => (
  <Badge label="American Express">
    <rect x="6" y="7" width="48" height="24" rx="4" fill="#016FD0" />
    <text x="30" y="23.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="900" fill="#fff" letterSpacing="0.6">AMEX</text>
  </Badge>
);

export const PayPal = () => (
  <Badge label="PayPal">
    <text x="30" y="24" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="12.5" fontWeight="900" fontStyle="italic">
      <tspan fill="#003087">Pay</tspan>
      <tspan fill="#009CDE">Pal</tspan>
    </text>
  </Badge>
);

export const Yappy = () => (
  <Badge label="Yappy">
    <text x="30" y="24" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="800" fill="#0a0a0a">Yappy</text>
  </Badge>
);

export const Bank = () => (
  <Badge label="Transferencia bancaria">
    <g fill="none" stroke="#0a0a0a" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M20 15.5 30 10l10 5.5z" />
      <path d="M22.5 17.5v8M27.5 17.5v8M32.5 17.5v8M37.5 17.5v8M20 28h20" />
    </g>
  </Badge>
);

export function AcceptedPayments() {
  return (
    <div className="pm-row">
      <Visa />
      <Mastercard />
      <Amex />
      <PayPal />
      <Yappy />
      <Bank />
    </div>
  );
}
