import { useEffect } from "react";

import { usePathname, useSearchParams } from "next/navigation";

export function useNavigationHistory() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const history = JSON.parse(sessionStorage.getItem("navHistory") ?? "[]");
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    // avoid duplicate entries
    if (history[history.length - 1] !== current) {
      history.push(current);
      sessionStorage.setItem("navHistory", JSON.stringify(history));
    }
  }, [pathname, searchParams]);

  const goBack = (fallback = "/") => {
    const history = JSON.parse(sessionStorage.getItem("navHistory") ?? "[]");
    history.pop(); // remove current page
    const previous = history[history.length - 1] ?? fallback;
    sessionStorage.setItem("navHistory", JSON.stringify(history));
    return previous;
  };

  return { goBack };
}
