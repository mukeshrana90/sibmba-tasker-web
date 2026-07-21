import { useEffect, useRef } from "react";

/**
 * Dismiss popover on outside interaction. Tuned for iOS Safari:
 * - Grace period after open so the opening tap cannot close the menu
 * - document "click" in capture phase (not pointerdown/touchstart)
 * - Delayed listener attach so open toggle finishes first
 */
export function useDismissOnOutsidePointer(ref, isOpen, onDismiss) {
  const suppressDismissRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      suppressDismissRef.current = false;
      return undefined;
    }

    suppressDismissRef.current = true;
    const suppressTimer = window.setTimeout(() => {
      suppressDismissRef.current = false;
    }, 500);

    const handleOutside = (event) => {
      if (suppressDismissRef.current) return;
      const root = ref.current;
      if (!root || root.contains(event.target)) return;
      onDismiss();
    };

    const attachTimer = window.setTimeout(() => {
      document.addEventListener("click", handleOutside, true);
    }, 100);

    return () => {
      window.clearTimeout(suppressTimer);
      window.clearTimeout(attachTimer);
      document.removeEventListener("click", handleOutside, true);
    };
  }, [isOpen, onDismiss, ref]);
}

/**
 * Toggle handler for header popovers. Uses pointerup + preventDefault
 * to block iOS ghost clicks that immediately re-toggle the menu.
 */
export function usePopoverToggle(setOpen, { onBeforeOpen } = {}) {
  const lockRef = useRef(false);

  return (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (lockRef.current) return;
    lockRef.current = true;
    window.setTimeout(() => {
      lockRef.current = false;
    }, 400);

    setOpen((prev) => {
      const next = !prev;
      if (next) onBeforeOpen?.();
      return next;
    });
  };
}
