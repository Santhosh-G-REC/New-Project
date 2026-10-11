import { Suspense } from "react";
import { InterviewOnePager } from "../../../../components/InterviewOnePager";

export default function OnePagerPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-zinc-100" />
          <div className="h-64 rounded-xl bg-zinc-100" />
        </div>
      }
    >
      <InterviewOnePager />
    </Suspense>
  );
}
