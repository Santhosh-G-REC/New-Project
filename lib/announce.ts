// Global screen-reader announcer: quick actions (stage logging, follow-ups,
// bulk moves) change state silently, so they post a message to the aria-live
// region rendered by Shell.

export function announce(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>("placetrack:announce", { detail: message }));
}

/** Props for Shell's live region: the message plus a counter so repeats re-announce. */
export interface Announcement {
  message: string;
  n: number;
}

export function listenForAnnouncements(onMessage: (a: Announcement) => void): () => void {
  let n = 0;
  const handler = (e: Event) => {
    n += 1;
    onMessage({ message: (e as CustomEvent<string>).detail, n });
  };
  window.addEventListener("placetrack:announce", handler);
  return () => window.removeEventListener("placetrack:announce", handler);
}
