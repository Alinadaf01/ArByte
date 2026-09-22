import { useEffect, useState } from "react";

/** برای تفاوت رفتار موبایل/دسکتاپ (بند «Responsive System» طراحی) — نه CSS، فقط رفتار (مثل Select → Bottom Sheet). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const listener = () => setMatches(mql.matches);
    listener();
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

/** بند «Responsive System» طراحی: موبایل ≤۷۶۷px. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
