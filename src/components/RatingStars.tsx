"use client";

import { useState } from "react";

/**
 * Five selectable stars for private feedback (1 = very bad … 5 = excellent). The value goes
 * in a hidden input named "rating". Keyboard: arrows move, the group is one tab stop.
 */
export function RatingStars({ labels, pick, invalid }: { labels: readonly string[]; pick: string; invalid?: boolean }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const set = (n: number) => setValue(Math.max(1, Math.min(5, n)));
  return (
    <div className="rating">
      <input type="hidden" name="rating" value={value || ""} />
      <div
        className="rating-stars"
        role="radiogroup"
        aria-label={labels.join(", ")}
        aria-invalid={invalid || undefined}
        onMouseLeave={() => setHover(0)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(value + 1); }
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(value - 1); }
        }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} · ${labels[n - 1]}`}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            className={`rating-star${n <= shown ? " on" : ""}${n === value ? " picked" : ""}`}
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.6l2.82 5.72 6.31.92-4.57 4.45 1.08 6.29L12 17.01l-5.64 2.97 1.08-6.29L2.87 9.24l6.31-.92L12 2.6z" />
            </svg>
          </button>
        ))}
      </div>
      <p className={`rating-label${shown ? " on" : ""}`} aria-live="polite">{shown ? labels[shown - 1] : pick}</p>
    </div>
  );
}
