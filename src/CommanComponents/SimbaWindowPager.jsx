const DEFAULT_WINDOW = 6;

export function getVisiblePages(current, total, windowSize = DEFAULT_WINDOW) {
  if (total <= windowSize) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = current - Math.floor(windowSize / 2);
  if (start < 1) start = 1;
  if (start + windowSize - 1 > total) {
    start = total - windowSize + 1;
  }
  return Array.from({ length: windowSize }, (_, i) => start + i);
}

export default function SimbaWindowPager({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = getVisiblePages(page, totalPages);

  const go = (next) => {
    const p = Math.max(1, Math.min(totalPages, next));
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pager">
      <button
        type="button"
        className="pg"
        disabled={page <= 1}
        aria-label="First page"
        onClick={() => go(1)}
      >
        «
      </button>
      <button
        type="button"
        className="pg"
        disabled={page <= 1}
        aria-label="Previous page"
        onClick={() => go(page - 1)}
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pg${page === p ? " active" : ""}`}
          onClick={() => go(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pg"
        disabled={page >= totalPages}
        aria-label="Next page"
        onClick={() => go(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className="pg"
        disabled={page >= totalPages}
        aria-label="Last page"
        onClick={() => go(totalPages)}
      >
        »
      </button>
    </div>
  );
}
