"use client";

import { cx } from "../lib/utils";

/**
 * 1–5 "excitement level" stars (Teal pattern). Renders read-only stars,
 * or an interactive selector when onChange is provided.
 */
export function InterestStars({
  value,
  onChange,
  small,
}: {
  value: number;
  onChange?: (v: number) => void;
  small?: boolean;
}) {
  const size = small ? "text-[11px]" : "text-base";
  if (onChange) {
    return (
      <div className="flex items-center gap-0.5" role="group" aria-label="Interest level">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-pressed={value === n}
            aria-label={`${n} of 5 interest`}
            className={cx(
              size,
              "rounded px-0.5 transition-colors",
              n <= value ? "text-amber-500" : "text-zinc-300 hover:text-amber-400"
            )}
          >
            ★
          </button>
        ))}
        {value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className="ml-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
          >
            Clear
          </button>
        )}
      </div>
    );
  }
  return (
    <span
      className={cx(size, "tracking-tight text-amber-500")}
      role="img"
      aria-label={`Interest ${value} of 5`}
      title={`Interest: ${value}/5`}
    >
      {"★".repeat(value)}
      <span className="text-zinc-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}
