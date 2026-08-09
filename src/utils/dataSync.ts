import { useEffect, useRef } from "react";

/** Simple module-level pub/sub so any CRUD operation can trigger
 *  a refetch of mounted dashboards/lists without a page reload. */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Broadcast after login/logout so mounted contexts (e.g. PermissionProvider)
 *  can re-read the authenticated role without a full page reload. */
export const AUTH_CHANGED_EVENT = "pawguard:auth-changed";

export function notifyAuthChanged(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function subscribeToDataChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call after any successful Create/Update/Delete to keep every
 *  mounted dashboard/list in sync with the database. */
export function notifyDataChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* never let one subscriber break the others */
    }
  });
}

/** Hook that refetches whenever `notifyDataChanged()` is called anywhere.
 *  The callback is kept stable via a ref to avoid re-subscribing on every render. */
export function useDataSync(refetch: () => void | Promise<void>): void {
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  });

  useEffect(() => {
    return subscribeToDataChange(() => {
      void refetchRef.current();
    });
  }, []);
}