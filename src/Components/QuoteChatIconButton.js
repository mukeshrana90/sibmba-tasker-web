/** Circular chat glyph for quote cards (customer starts; supply shows toast). */
export default function QuoteChatIconButton({
  onClick,
  title = "Chat",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`log-quote-chat-btn ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
