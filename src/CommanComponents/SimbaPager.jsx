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

  const items = [];
  items.push(
    <button
      key="first"
      type="button"
      className="pg"
      disabled={page === 1}
      aria-label="First page"
      onClick={() => go(1)}
    >
      «
    </button>
  );
  items.push(
    <button
      key="prev"
      type="button"
      className="pg"
      disabled={page === 1}
      aria-label="Previous page"
      onClick={() => go(page - 1)}
    >
      ‹
    </button>
  );

  let prev = 0;
  sorted.forEach((n) => {
    if (n - prev > 1) {
      items.push(
        <span key={`dots-${n}`} className="pg dots">
          …
        </span>
      );
    }
    items.push(
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

  items.push(
    <button
      key="next"
      type="button"
      className="pg"
      disabled={page === totalPages}
      aria-label="Next page"
      onClick={() => go(page + 1)}
    >
      ›
    </button>
  );
  items.push(
    <button
      key="last"
      type="button"
      className="pg"
      disabled={page === totalPages}
      aria-label="Last page"
      onClick={() => go(totalPages)}
    >
      »
    </button>
  );

  return <div className="pager">{items}</div>;
}
