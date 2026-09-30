/** Shared line icons for logistics Post Job / form chrome (mint tile style). */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconTruck({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M1 8h12v9H1zM13 11h4l3 3v3h-7V11z" />
      <circle {...stroke} cx="5.5" cy="18" r="1.6" />
      <circle {...stroke} cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}

export function IconCab({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M3 16v-3l2-5h14l2 5v3H3z" />
      <path {...stroke} d="M9 8V6h6v2M3 13h18" />
      <circle {...stroke} cx="7" cy="17.5" r="1.6" />
      <circle {...stroke} cx="17" cy="17.5" r="1.6" />
    </svg>
  );
}

export function IconTractor({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle {...stroke} cx="7" cy="17" r="3" />
      <circle {...stroke} cx="17" cy="17" r="2.4" />
      <path {...stroke} d="M7 14h5.5L14 8h4" />
      <path {...stroke} d="M4 11h3.5M14 8V6h3" />
    </svg>
  );
}

export function IconHouse({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />
    </svg>
  );
}

export function IconFactory({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M3 21V9l5 3V9l5 3V7h3v14H3z" />
      <path {...stroke} d="M16 5c.8-1.2 1.6-1.2 2.4 0M19 5c.7-1 1.4-1 2.1 0" />
    </svg>
  );
}

export function IconPin({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle {...stroke} cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function IconMap({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5 9 4.5z" />
      <path {...stroke} d="M9 4.5v13M15 6.5v13" />
    </svg>
  );
}

export function IconCube({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M12 3 4.5 7.5v9L12 21l7.5-4.5v-9L12 3z" />
      <path {...stroke} d="M12 12v9M12 12 4.5 7.5M12 12l7.5-4.5" />
    </svg>
  );
}

export function IconWeight({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M7 8h10l2 12H5L7 8z" />
      <path {...stroke} d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  );
}

export function IconCalendar({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect {...stroke} x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path {...stroke} d="M8 3.5v4M16 3.5v4M3.5 10h17" />
      <path {...stroke} d="M8 14h.01M12 14h.01M16 14h.01" />
    </svg>
  );
}

export function IconBolt({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z" />
    </svg>
  );
}

export function IconDollar({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M12 7.5v9M14.5 9.5c0-1.2-1.1-2-2.5-2s-2.5.8-2.5 2c0 2.5 5 1.5 5 4 0 1.2-1.1 2-2.5 2s-2.5-.8-2.5-2" />
    </svg>
  );
}

export function IconDoc({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M7 3.5h7l4 4V20.5H7z" />
      <path {...stroke} d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}

export function IconGrid({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect {...stroke} x="4" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect {...stroke} x="13.5" y="4" width="6.5" height="6.5" rx="1.2" />
      <rect {...stroke} x="4" y="13.5" width="6.5" height="6.5" rx="1.2" />
      <rect {...stroke} x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2" />
    </svg>
  );
}

export function IconGallery({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect {...stroke} x="3.5" y="5" width="17" height="14" rx="2" />
      <circle {...stroke} cx="9" cy="10" r="1.6" />
      <path {...stroke} d="M3.5 16l4.5-4 3.5 3 3-2.5 6 3.5" />
    </svg>
  );
}

export function IconPlusCircle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function IconCloudUpload({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        {...stroke}
        d="M8 18h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5-1.5A3.5 3.5 0 0 0 8 18z"
      />
      <path {...stroke} d="M12 15V9M9.5 11.5 12 9l2.5 2.5" />
    </svg>
  );
}

export function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4-9.4 9.4z"
      />
    </svg>
  );
}

export function IconSend({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M4 11.5 20 4l-4.5 16-4-5.5L4 11.5z" />
      <path {...stroke} d="M11.5 14.5 20 4" />
    </svg>
  );
}

export function IconChevronRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const CAT = {
  logistic: IconTruck,
  cab: IconCab,
  agricultural: IconTractor,
  construction: IconHouse,
  industrial: IconFactory,
  truck: IconTruck,
  agri: IconTractor,
  const: IconHouse,
  indust: IconFactory,
};

export function CategoryGlyph({ type, size = 26 }) {
  const Comp = CAT[type] || IconTruck;
  return <Comp size={size} />;
}

/** Label row: mint icon tile + text */
export function LogFieldLabel({ icon, children, required }) {
  return (
    <span className="log-fl log-fl--icon">
      {icon ? <span className="log-fl__icon">{icon}</span> : null}
      <span className="log-fl__text">
        {children}
        {required ? <span className="log-req"> *</span> : null}
      </span>
    </span>
  );
}
