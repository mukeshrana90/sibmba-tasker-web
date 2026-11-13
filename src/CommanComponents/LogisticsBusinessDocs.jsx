import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { refreshLogisticsAccount } from "./LogisticsAccountBanner";
import { buildPublicAssetUrl } from "../utils/ImagePath";
import { DOC_ACCEPT, keepAllowedFiles } from "../utils/uploadLimits";
import "../Pages/logistics/logistics.css";

// Company documents for the Simba approval (29 Oct 2026). Shown on
// /logistics/owner/verification (after a skipped sign-up step 2, a Google / Apple /
// app sign-up, or a rejection) and on Edit profile (30 Oct 2026). Every upload
// emails the Simba admins to check them.

const FALLBACK_TYPES = [
  { type: "business_registration", label: "Business registration certificate", required: true },
  { type: "owner_id", label: "Owner ID", required: true, expiry_required: true },
  { type: "tax", label: "Tax certificate", required: false, expiry_required: false },
  { type: "address_proof", label: "Proof of address", required: false },
];

// 30 Oct 2026: expiry dates — first valid date is tomorrow
const tomorrowYmd = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const fmtExpiry = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "");
const EXPIRY_CHIP = {
  expired: { label: "Expired", chip: "log-chip--closed" },
  today: { label: "Expires today", chip: "log-chip--closed" },
  expiring: { label: "Expiring soon", chip: "log-chip--pending" },
};
// 12 Nov 2026: national IDs have no expiry date in Zimbabwe
const FALLBACK_KINDS = [
  { value: "national_id", label: "National ID", expiry_required: false },
  { value: "passport", label: "Passport", expiry_required: true },
  { value: "driving_licence", label: "Driving licence", expiry_required: true },
];
const OWNER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "company", label: "Company" },
];

const REVIEW_CHIP = {
  pending: { label: "Pending check", chip: "log-chip--progress" },
  verified: { label: "Verified", chip: "log-chip--done" },
  rejected: { label: "Rejected", chip: "log-chip--closed" },
};

/**
 * Which kind the Owner ID form works on: one to fix first, else one not added yet.
 * null = one of each is on file and fine, so there's nothing to add (one per kind).
 */
function nextIdKind(data) {
  const ids = (data?.documents || []).filter((d) => d.type === "owner_id");
  // A rejected or expired ID needs replacing first
  const fix = ids.find((d) => d.id_kind && (d.review?.status === "rejected" || d.expiry_status === "expired"));
  if (fix) return fix.id_kind;
  const have = new Set(ids.map((d) => d.id_kind));
  const kinds = data?.id_kinds?.length ? data.id_kinds : FALLBACK_KINDS;
  return kinds.find((k) => !have.has(k.value))?.value || null;
}

function fileHref(url) {
  if (!url) return null;
  const s = String(url);
  if (s.startsWith("http")) return s;
  return buildPublicAssetUrl(s.startsWith("/") ? s : `/${s}`);
}

/** Status callout + upload list for the owner's company documents (verification page and profile). */
export function BusinessDocsPanel() {
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [idKind, setIdKind] = useState("national_id");
  const [expiries, setExpiries] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dispatch(LogisticsActions.getBusinessDocs());
      if (res?.payload?.success === false || res?.error) {
        toast.error(res?.payload?.message || "Could not load your documents");
        return;
      }
      const d = res?.payload?.data || null;
      setData(d);
      setIdKind(nextIdKind(d));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (type, file) => {
    const fd = new FormData();
    fd.append(type, file);
    if (type === "owner_id") fd.append("owner_id_kind", idKind);
    if (expiries[type]) fd.append(`${type}_expires`, expiries[type]);
    setBusy(type);
    try {
      const res = await dispatch(LogisticsActions.uploadBusinessDocs(fd));
      const p = res?.payload;
      if (p?.success === false || res?.error || (p?.status_code && p.status_code !== 200)) {
        toast.error(p?.message || "Upload failed");
        return;
      }
      toast.success(p?.message || "Document uploaded");
      setData(p?.data || null);
      if (type === "owner_id") setIdKind(nextIdKind(p?.data));
      setExpiries((x) => ({ ...x, [type]: "" }));
      refreshLogisticsAccount();
    } finally {
      setBusy("");
    }
  };

  const approval = data?.approval?.status || "pending";
  const docs = data?.documents || [];
  const types = data?.types?.length ? data.types : FALLBACK_TYPES;
  const kinds = data?.id_kinds?.length ? data.id_kinds : FALLBACK_KINDS;
  const missing = data?.missing || [];
  const ownerType = data?.owner_type || "company";
  // Owner ID: expiry depends on the kind (none for a national ID)
  const expiryRequiredFor = (t) =>
    t.type === "owner_id"
      ? kinds.find((k) => k.value === idKind)?.expiry_required ?? idKind !== "national_id"
      : Boolean(t.expiry_required);

  const changeOwnerType = async (next) => {
    if (next === ownerType || busy) return;
    setBusy("owner_type");
    try {
      const res = await dispatch(LogisticsActions.patchMe({ logistics_owner_type: next }));
      const p = res?.payload;
      if (p?.success === false || res?.error) {
        toast.error(p?.message || "Could not change it");
        return;
      }
      await load();
      refreshLogisticsAccount();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="log-bizdoc-page" data-approval={approval}>
      <div
        className={`log-callout ${
          approval === "approved" ? "log-callout--ok" : approval === "rejected" ? "log-callout--danger" : "log-callout--warn"
        } log-bizdoc-status`}
        role="status"
      >
        <p>
          {approval === "approved" ? (
            <>
              <strong>Your company is approved by Simba.</strong> You can add equipment and invite operators. Each unit is
              shown to customers once Simba verifies its documents and its operator&apos;s licence.
            </>
          ) : approval === "rejected" ? (
            <>
              <strong>Simba couldn&apos;t approve your company.</strong>{" "}
              {data?.approval?.reason ? `Reason: ${data.approval.reason}. ` : ""}Upload corrected documents below — they go
              back to Simba for a new check.
            </>
          ) : missing.length ? (
            <>
              <strong>Upload your business documents.</strong> Simba needs your{" "}
              {missing.map((m) => m.label.toLowerCase()).join(" and ")} before it can approve your company.
            </>
          ) : (
            <>
              <strong>Simba is checking your documents.</strong> You can add equipment and invite operators once your
              company is approved — we&apos;ll email you.
            </>
          )}
        </p>
        {approval === "approved" ? (
          <div className="log-bizdoc-status__links">
            <Link className="logistics-cta" to="/logistics/owner/fleet/add">
              Add equipment
            </Link>
            <Link className="logistics-cta logistics-cta--ghost" to="/logistics/owner/operators/add">
              Invite operator
            </Link>
          </div>
        ) : null}
      </div>

      {approval !== "approved" ? (
        <div className="log-owner-type log-owner-type--panel" role="radiogroup" aria-label="Registering as" data-testid="owner-type">
          <span className="log-owner-type__label">Registering as</span>
          <div className="log-owner-type__options">
            {OWNER_TYPES.map((t) => (
              <label key={t.value} className={`log-owner-type__opt${ownerType === t.value ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="logistics_owner_type"
                  value={t.value}
                  checked={ownerType === t.value}
                  disabled={Boolean(busy)}
                  onChange={() => changeOwnerType(t.value)}
                />
                <b>{t.label}</b>
                <small>
                  {t.value === "individual"
                    ? "Owner ID only — no business registration certificate needed"
                    : "Business registration certificate and owner ID"}
                </small>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="log-bizdoc-list">
        {types.map((t) => {
          const copies = docs.filter((d) => d.type === t.type);
          const doc = copies[0];
          const isOwnerId = t.type === "owner_id";
          const sameKind = isOwnerId ? copies.find((d) => d.id_kind === idKind) : doc;
          const kindLabel = kinds.find((k) => k.value === idKind)?.label || "ID";
          // One of each kind: the list offers kinds not on file, plus the one being replaced
          const offeredKinds = kinds.filter((k) => k.value === idKind || !copies.some((d) => d.id_kind === k.value));
          const formHidden = isOwnerId && !idKind;
          const defaultKind = isOwnerId ? nextIdKind(data) : null;
          return (
            <div key={t.type} className="log-bizdoc" data-type={t.type} data-doc-anchor={t.type} data-status={doc?.review?.status || "missing"}>
              <div className="log-bizdoc__main">
                <div className="log-bizdoc__title">
                  <b>{t.label}</b>
                  {t.required ? <span className="log-bizdoc__req">Required</span> : <span className="log-bizdoc__opt">Optional</span>}
                </div>
                {isOwnerId ? (
                  <p className="log-hint log-bizdoc__idhelp" data-testid="owner-id-help">
                    Add one or more: national ID, passport, driving licence. Simba checks each one. You need a driving licence to operate a unit yourself.
                  </p>
                ) : null}
                {copies.map((c) => {
                  const review = REVIEW_CHIP[c.review?.status] || REVIEW_CHIP.pending;
                  const href = fileHref(c.url);
                  return (
                    <div className="log-bizdoc__copy" key={c._id || c.url} data-id-kind={c.id_kind || undefined}>
                  <div className="log-bizdoc__meta">
                    <span className={`log-chip ${review.chip} log-bizdoc__status`}>{review.label}</span>
                    {c.id_kind_label ? <span className="log-hint">{c.id_kind_label}</span> : null}
                    {EXPIRY_CHIP[c.expiry_status] ? (
                      <span className={`log-chip ${EXPIRY_CHIP[c.expiry_status].chip} log-bizdoc__expiry-chip`}>{EXPIRY_CHIP[c.expiry_status].label}</span>
                    ) : null}
                    {c.expires ? <span className="log-hint log-bizdoc__expires">Expires {fmtExpiry(c.expires)}</span> : null}
                    {href ? (
                      <a className="log-bizdoc__view" href={href} target="_blank" rel="noreferrer">
                        {c.name || "View file"}
                      </a>
                    ) : null}
                    {isOwnerId && c.id_kind && c.id_kind !== idKind ? (
                      <button
                        type="button"
                        className="log-bizdoc__replace-id"
                        data-testid={`owner-id-replace-${c.id_kind}`}
                        onClick={() => setIdKind(c.id_kind)}
                      >
                        Replace
                      </button>
                    ) : null}
                  </div>
                {c.review?.status === "rejected" && c.review.reason ? (
                  <p className="log-bizdoc__reason">Rejected: {c.review.reason}</p>
                ) : null}
                {c.expiry_status === "expired" ? (
                  <p className="log-bizdoc__reason">Expired — upload the renewed document. The old file is removed and Simba checks the new one.</p>
                ) : null}
                    </div>
                  );
                })}
                {!doc ? (
                  <div className="log-bizdoc__meta">
                    <span className={`log-chip ${t.required ? "log-chip--closed" : "log-chip--pending"} log-bizdoc__status`}>
                      {t.required ? "Missing" : "Not uploaded"}
                    </span>
                  </div>
                ) : null}
              </div>
              {formHidden ? null : (
              <div className="log-bizdoc__actions">
                {t.type === "owner_id" ? (
                  <select
                    className="log-bizdoc__kind"
                    aria-label="Type of ID"
                    value={idKind}
                    onChange={(e) => setIdKind(e.target.value)}
                  >
                    {offeredKinds.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <label className="log-bizdoc__date">
                  <span>
                    {expiryRequiredFor(t)
                      ? "Expiry date *"
                      : t.type === "owner_id"
                        ? "Expiry date (optional — national IDs don't expire)"
                        : "Expiry date (optional)"}
                  </span>
                  <input
                    type="date"
                    name={`${t.type}_expires`}
                    min={tomorrowYmd()}
                    value={expiries[t.type] || ""}
                    onChange={(e) => setExpiries((x) => ({ ...x, [t.type]: e.target.value }))}
                  />
                </label>
                <label
                  className={`logistics-cta ${sameKind ? "logistics-cta--ghost" : "logistics-cta--primary"} log-bizdoc__upload${busy === t.type ? " is-busy" : ""}${
                    expiryRequiredFor(t) && !expiries[t.type] ? " is-locked" : ""
                  }`}
                  title={expiryRequiredFor(t) && !expiries[t.type] ? "Pick the expiry date first" : undefined}
                  onClick={(e) => {
                    if (expiryRequiredFor(t) && !expiries[t.type]) {
                      e.preventDefault();
                      toast.info(`Pick the ${t.label.toLowerCase()} expiry date first`);
                    }
                  }}
                >
                  <input
                    type="file"
                    name={t.type}
                    accept={`${DOC_ACCEPT},.doc,.docx`}
                    hidden
                    disabled={Boolean(busy)}
                    onChange={(e) => {
                      const [f] = keepAllowedFiles(e.target.files);
                      e.target.value = "";
                      if (f) upload(t.type, f);
                    }}
                  />
                  {busy === t.type
                    ? "Uploading…"
                    : isOwnerId && doc
                      ? `${sameKind ? "Replace" : "Add"} ${kindLabel}`
                      : doc
                        ? "Replace"
                        : "Upload"}
                </label>
                {isOwnerId && sameKind && defaultKind !== idKind ? (
                  <button type="button" className="log-bizdoc__replace-id" data-testid="owner-id-replace-cancel" onClick={() => setIdKind(defaultKind)}>
                    Cancel
                  </button>
                ) : null}
              </div>
              )}
            </div>
          );
        })}
        {loading && !data ? <p className="log-hint">Loading your documents…</p> : null}
      </div>
    </div>
  );
}


// Logistics fleet / equipment owner (role 4 without an owner above them)
const isFleetOwner = () => localStorage.getItem("role") === "4" && !localStorage.getItem("owner_id");

/** Edit profile → "Business documents" (fleet owners only). */
export default function LogisticsBusinessDocsCard() {
  if (!isFleetOwner()) return null;
  return (
    <div className="log-bizdoc-profile" id="business-documents">
      <b>Business documents</b>
      <p className="log-hint mb-2">Upload or replace your company documents. Simba is told right away and checks them.</p>
      <BusinessDocsPanel />
    </div>
  );
}
