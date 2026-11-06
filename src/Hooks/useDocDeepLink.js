import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Item 19: a notification opens the right document. Reads ?doc=<type>, waits for
 * its row ([data-doc-anchor]) to render, scrolls to it and highlights it.
 */
export default function useDocDeepLink() {
  const { search } = useLocation();
  const doc = new URLSearchParams(search).get("doc");

  useEffect(() => {
    if (!doc) return undefined;
    let tries = 0;
    let clear = 0;
    const safe = String(doc).replace(/["\\\]]/g, "");
    const timer = setInterval(() => {
      tries += 1;
      const el = document.querySelector(`[data-doc-anchor="${safe}"]`);
      if (el) {
        clearInterval(timer);
        el.scrollIntoView?.({ behavior: "smooth", block: "center" });
        el.classList.add("is-doc-highlight");
        clear = setTimeout(() => el.classList.remove("is-doc-highlight"), 4000);
      } else if (tries > 40) {
        clearInterval(timer);
      }
    }, 150);
    return () => {
      clearInterval(timer);
      clearTimeout(clear);
    };
  }, [doc]);
}
