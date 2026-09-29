import { useEffect } from "react";
import { useBlocker, type Blocker } from "react-router-dom";

/** Blocks in-app navigation and the tab close/reload while `when` is true
 * (react-hook-form's formState.isDirty, typically). The caller renders a
 * ConfirmDialog keyed off blocker.state === "blocked". */
export function useUnsavedChangesGuard(when: boolean): Blocker {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);

  return blocker;
}
