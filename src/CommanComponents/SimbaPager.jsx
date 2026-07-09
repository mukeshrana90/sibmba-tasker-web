export default function SimbaPager({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const nums = new Set(
    [1, totalPages, page, page - 1, page + 1].filter(
      (n) => n >= 1 && n <= totalPages
    )
  );
  if (page <= 4) {
    for (let i = 1; i <= Math.min(5, totalPages); i++) nums.add(i);
  }
  const sorted = [...nums].sort((a, b) => a - b);

  const go = (next) => {
    const p = Math.max(1, Math.min(totalPages, next));
    onPageChange(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageItems = [];
  let prev = 0;
  sorted.forEach((n) => {
    if (n - prev > 1) {
      pageItems.push(
        <span key={`dots-${n}`} className="pg dots">
          …
        </span>
      );
    }
    pageItems.push(
      <button
        key={n}
        type="button"
        className={`pg${n === page ? " active" : ""}`}
        onClick={() => go(n)}
      >
        {n}
      </button>
    );
    prev = n;
  });

  return (
    <div className="pager">
      <div className="pager-edge pager-edge--start">
        <button
          type="button"
          className="pg"
          disabled={page === 1}
          aria-label="First page"
          onClick={() => go(1)}
        >
          «
        </button>
        <button
          type="button"
          className="pg"
          disabled={page === 1}
          aria-label="Previous page"
          onClick={() => go(page - 1)}
        >
          ‹
        </button>
      </div>

      <div className="pager-pages">{pageItems}</div>

      <div className="pager-edge pager-edge--end">
        <button
          type="button"
          className="pg"
          disabled={page === totalPages}
          aria-label="Next page"
          onClick={() => go(page + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className="pg"
          disabled={page === totalPages}
          aria-label="Last page"
          onClick={() => go(totalPages)}
        >
          »
        </button>
      </div>
    </div>
  );
}
