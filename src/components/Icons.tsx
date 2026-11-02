// Hand-drawn 24px icons, 1.75 stroke, round joins. No icon library.

type P = { className?: string; style?: React.CSSProperties };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const StarSolid = ({ className, style, color = "#D4AF37" }: P & { color?: string }) => (
  <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
    <path fill={color} d="M12 2.6l2.82 5.72 6.31.92-4.57 4.45 1.08 6.29L12 17.01l-5.64 2.97 1.08-6.29L2.87 9.24l6.31-.92L12 2.6z" />
  </svg>
);


export const Chat = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M20 11.5a7.5 7.5 0 0 1-11.1 6.58L4 19.5l1.42-4.9A7.5 7.5 0 1 1 20 11.5z" />
    <path d="M9 11.5h.01M12.5 11.5h.01M16 11.5h.01" strokeWidth={2.4} />
  </svg>
);


export const Check = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.2} />
  </svg>
);

export const Tap = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M8.5 13.5V6.75a1.75 1.75 0 0 1 3.5 0V12" />
    <path d="M12 11V9.75a1.75 1.75 0 0 1 3.5 0V12m0-1a1.75 1.75 0 0 1 3.5 0v3.5a6.5 6.5 0 0 1-6.5 6.5h-.6a6 6 0 0 1-4.6-2.15L4.7 16.8a1.7 1.7 0 0 1 2.6-2.2l1.2 1.3" />
    <path d="M5.2 6.2a5.5 5.5 0 0 1 2.1-2.6M18.8 6.2a5.5 5.5 0 0 0-2.1-2.6" />
  </svg>
);

export const Bell = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5z" />
    <path d="M10 19.5a2.1 2.1 0 0 0 4 0" />
  </svg>
);

export const Chart = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M4 19.5h16" />
    <path d="M6.5 15.5l4-4.5 3 3 5-6.5" />
    <path d="M15 7.5h3.5V11" />
  </svg>
);

export const Shield = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z" />
    <path d="M8.75 12l2.25 2.25 4.25-4.5" />
  </svg>
);

export const Pin = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const Reply = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M9.5 8.5L5 13l4.5 4.5" />
    <path d="M5 13h9a5 5 0 0 0 5-5V6.5" />
  </svg>
);



export const Gift = (p: P) => (
  <svg viewBox="0 0 24 24" {...base} {...p} aria-hidden="true">
    <path d="M4 11h16v9H4zM3 7.5h18V11H3zM12 7.5V20" />
    <path d="M12 7.5c-1.5-3-5-3.5-5-1.25C7 7.5 9.5 7.5 12 7.5zM12 7.5c1.5-3 5-3.5 5-1.25C17 7.5 14.5 7.5 12 7.5z" />
  </svg>
);
