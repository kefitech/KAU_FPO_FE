"use client";

import { useEffect } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Opens `?session=<id>` — the link a training-comment notification carries — then
 * drops the param so a refresh or a table change doesn't reopen it.
 * Reads search params, so render it inside a <Suspense>.
 */
export function OpenSessionFromUrl({ onOpen }: { onOpen: (id: number) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sessionId = Number(searchParams.get("session"));

  useEffect(() => {
    if (!sessionId) return;
    onOpen(sessionId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("session");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [sessionId, onOpen, searchParams, pathname, router]);

  return null;
}
