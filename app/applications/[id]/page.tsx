import { Suspense } from "react";
import { ApplicationDetail } from "../../../components/ApplicationDetail";

export default function ApplicationPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-zinc-100" />
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      }
    >
      <ApplicationDetail />
    </Suspense>
  );
}
