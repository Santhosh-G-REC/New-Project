import type { OfferOutcome } from "../lib/types";
import { cx } from "../lib/utils";

/** Decision state of an offer-stage application. */
export function OutcomeChip({ outcome }: { outcome?: OfferOutcome }) {
  const o = outcome ?? "waiting";
  return (
    <span
      className={cx(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
        o === "accepted"
          ? "bg-emerald-100 text-emerald-800"
          : o === "declined"
            ? "bg-zinc-200 text-zinc-600"
            : "bg-amber-50 text-amber-700"
      )}
    >
      {o === "accepted" ? "Accepted" : o === "declined" ? "Declined" : "Waiting"}
    </span>
  );
}
