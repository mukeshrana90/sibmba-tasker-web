import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import Api from "../../Services/api";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { buildPublicAssetUrl, defaultImage } from "../../utils/ImagePath";
import { Roles } from "../../utils/Roles";
import { assetBookState } from "../../utils/logisticsBooking";
import "./logistics.css";
import {
  LogisticsDetailSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import { formatRate } from "../../utils/assetRate";

const AVAIL_LABEL = {
  available_now: "Available now",
  returning_empty: "Returning empty",
  offline: "Offline",
  scheduled: "Scheduled",
  on_job: "On job",
};

const AVAIL_COLOR = {
  available_now: "#0f5c4c",
  returning_empty: "#b45309",
  offline: "#6b7280",
  scheduled: "#1d4ed8",
  on_job: "#b8860b",
};

function assetPhotoUrl(path) {
  if (!path) return null;
  let normalized = String(path).replace(/\\/g, "/").trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }
  if (normalized.startsWith("http") || normalized.startsWith("blob:")) {
    return normalized;
  }
  const absPublic = normalized.indexOf("/public/");
  if (absPublic !== -1) {
    normalized = normalized.slice(absPublic + "/public".length);
  } else if (normalized.startsWith("public/")) {
    normalized = normalized.slice("public".length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return buildPublicAssetUrl(normalized);
}

function currentUserId() {
  return String(
    localStorage.getItem("userId") ||
      localStorage.getItem("_id") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id") ||
      ""
  );
}

function formatCapacity(capacity) {
  if (capacity?.value == null || capacity?.value === "") return null;
  return `${capacity.value} ${capacity.unit || "tons"}`;
}

function formatCarriage(carriage) {
  if (!carriage) return null;
  const L = carriage.length_m;
  const W = carriage.width_m;
  const H = carriage.height_m;
  if (L == null && W == null && H == null) return null;
  return [L, W, H]
    .map((n) => (n != null && n !== "" ? String(n) : "—"))
    .join(" × ") + " ft";
}

function formatPrice(hint) {
  return formatRate(hint);
}

function formatPhone(owner) {
  if (!owner?.phone_number) return "";
  return `${owner.country_code || ""}${owner.phone_number}`.trim();
}

function SpecRow({ label, value, valueTone }) {
  if (value == null || value === "") return null;
  return (
    <div className="log-asset-detail__spec">
      <span>{label}</span>
      <b className={valueTone ? `log-asset-detail__spec-val--${valueTone}` : undefined}>
        {value}
      </b>
    </div>
  );
}

export default function LogisticsAssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [owner, setOwner] = useState(null);
  const [history, setHistory] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await Api.get(`/logistics/asset/${id}`);
      const data = res?.data?.data || {};
      setAsset(data.asset || null);
      setOwner(data.owner || null);
      setHistory(data.history || null);
      setPhotoIdx(0);
      setLoaded(true);
    })();
  }, [id]);

  const role = Number(localStorage.getItem("role"));
  const myId = currentUserId();
  const ownerId = String(
    asset?.owner_id?._id || asset?.owner_id || owner?._id || ""
  );
  const ownerViewingOwn =
    loaded &&
    role === Roles.LOGISTICS &&
    myId &&
    ownerId &&
    myId === ownerId;

  const photos = useMemo(() => {
    const list = (asset?.photos || []).map(assetPhotoUrl).filter(Boolean);
    return list.length ? list : [defaultImage];
  }, [asset]);

  if (ownerViewingOwn) {
    return <Navigate to={`/logistics/owner/fleet/${id}`} replace />;
  }

  const rating = asset?.rating || { average: 0, count: 0 };
  const availState = asset?.availability?.state || "offline";
  const availLabel =
    asset?.availability?.state_label ||
    AVAIL_LABEL[availState] ||
    String(availState).replace(/_/g, " ");
  const availDetail = asset?.availability?.status_detail;
  const phone = formatPhone(owner);
  const showPhone = Boolean(owner?.contact_phone_visible && phone);
  const showEmail = Boolean(owner?.contact_phone_visible && owner?.email);
  const providerName =
    owner?.full_name ||
    owner?.company_name ||
    asset?.owner?.full_name ||
    "Fleet provider";
  const capacity = formatCapacity(asset?.capacity);
  const carriage = formatCarriage(asset?.carriage);
  const price = formatPrice(asset?.price_hint);
  const makeModel = [asset?.make, asset?.model].filter(Boolean).join(" ");
  const categoryName =
    asset?.category_id?.name || asset?.category?.name || null;
  const tags = [
    ...(asset?.capabilities || []),
    ...(asset?.services || []).filter(
      (s) =>
        !["agricultural", "construction", "industrial", "logistic"].includes(
          String(s).toLowerCase()
        )
    ),
  ];
  const completed =
    history?.completed_jobs ?? asset?.completed_jobs ?? 0;
  const { canBook, blockedReason, delayedNotice } = assetBookState(asset);

  return (
    <LogisticsPageShell
      title={asset?.name || "Asset"}
      crumbLabel="Asset"
      midCrumb={{ to: "/logistics/search", label: "Search" }}
    >
      {asset ? (
        <div className="log-asset-detail-page">
          <div className="log-asset-detail-hero">
            <div className="log-asset-detail-gallery">
              <img
                className="log-asset-detail-gallery__main"
                src={photos[photoIdx] || defaultImage}
                alt={asset.name || "Asset"}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultImage;
                }}
              />
              {photos.length > 1 ? (
                <div className="log-asset-detail-gallery__thumbs" role="list">
                  {photos.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      className={`log-asset-detail-gallery__thumb${
                        i === photoIdx ? " is-active" : ""
                      }`}
                      onClick={() => setPhotoIdx(i)}
                      aria-label={`Photo ${i + 1}`}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="log-asset-detail-summary">
              <div className="log-asset-detail-summary__chips">
                <span
                  className="log-chip"
                  style={{
                    background: `${AVAIL_COLOR[availState] || "#6b7280"}22`,
                    color: AVAIL_COLOR[availState] || "#6b7280",
                  }}
                >
                  {availLabel}
                </span>
                {availDetail ? (
                  <span className="log-chip">{availDetail}</span>
                ) : null}
                {asset.is_featured ? (
                  <span className="log-chip log-chip--active">Featured</span>
                ) : null}
                <span className="log-chip">
                  {asset.kind === "equipment" ? "Equipment" : asset.kind === "cab" ? "Cab" : "Truck"}
                </span>
              </div>

              <h2 className="log-asset-detail-summary__title">{asset.name}</h2>
              <p className="log-asset-detail-summary__meta">
                {(Number(rating.average) || 0).toFixed(1)} ★ ·{" "}
                {Number(rating.count) || 0} review
                {Number(rating.count) === 1 ? "" : "s"}
                {completed ? ` · ${completed} jobs completed` : ""}
              </p>

              {makeModel || categoryName || capacity ? (
                <p className="log-asset-detail-summary__line">
                  {[makeModel, categoryName, capacity]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              {price ? (
                <p className="log-asset-detail-summary__price">
                  From <strong>{price}</strong>
                </p>
              ) : (
                <p className="log-asset-detail-summary__price log-hint">
                  Rate on request — book to get a quote
                </p>
              )}

              <div className="log-asset-detail-actions">
                {canBook ? (
                  <Link
                    className="logistics-cta logistics-cta--primary log-asset-detail-actions__book"
                    to={`/logistics/post?asset=${asset._id}`}
                  >
                    {asset.kind === "cab" ? "Request ride now" : "Book / request quote"}
                  </Link>
                ) : (
                  <span className="log-hint">{blockedReason}</span>
                )}
                <Link
                  className="logistics-cta logistics-cta--ghost log-asset-detail-actions__back"
                  to="/logistics/search"
                >
                  Back to search
                </Link>
              </div>
              {delayedNotice ? (
                <p className="log-hint log-asset-detail-actions__notice">
                  {delayedNotice}
                </p>
              ) : null}
            </div>
          </div>

          <div className="log-asset-detail-grid">
            <section className="log-form-card log-asset-detail-panel">
              <h3 className="log-asset-detail-panel__title">Specifications</h3>
              <div className="log-asset-detail__specs">
                <SpecRow
                  label="Kind"
                  value={
                    asset.kind === "equipment"
                      ? "Equipment"
                      : asset.kind === "cab"
                        ? `Cab · ${asset.cab_class || ""}${asset.seats ? ` · ${asset.seats} seats` : ""}`
                        : "Logistic truck"
                  }
                />
                <SpecRow label="Category" value={categoryName} />
                <SpecRow label="Make" value={asset.make} />
                <SpecRow label="Model" value={asset.model} />
                <SpecRow label="Year" value={asset.year} />
                <SpecRow label="Capacity" value={capacity} />
                <SpecRow label="Carriage (L×W×H)" value={carriage} />
                <SpecRow label="Availability" value={availLabel} />
                {availDetail ? (
                  <SpecRow label="Status detail" value={availDetail} />
                ) : null}
                {asset.availability?.available_from ? (
                  <SpecRow
                    label="Available from"
                    value={new Date(
                      asset.availability.available_from
                    ).toLocaleDateString()}
                  />
                ) : null}
                <SpecRow
                  label="Direct booking"
                  value={
                    asset.direct_booking_enabled === false ? "Off" : "On"
                  }
                  valueTone={
                    asset.direct_booking_enabled === false ? "off" : "on"
                  }
                />
              </div>
              {tags.length ? (
                <div className="log-asset-detail-tags">
                  {tags.map((t) => (
                    <span key={t} className="log-chip">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              {asset.availability?.note ? (
                <p className="log-hint log-asset-detail-note">
                  {asset.availability.note}
                </p>
              ) : null}
            </section>

            <section className="log-form-card log-asset-detail-panel">
              <h3 className="log-asset-detail-panel__title">Provider</h3>
              <div className="log-asset-detail-provider">
                <div className="log-asset-detail-provider__head">
                  <b>{providerName}</b>
                  {Number(owner?.is_verified) === 1 ? (
                    <span className="log-chip log-chip--active">Verified</span>
                  ) : null}
                </div>
                {showEmail ? (
                  <p className="log-asset-detail-provider__row">{owner.email}</p>
                ) : null}
                {showPhone ? (
                  <p className="log-asset-detail-provider__row">
                    <a href={`tel:${phone}`}>{phone}</a>
                  </p>
                ) : (
                  <p className="log-hint log-asset-detail-provider__privacy">
                    Phone is hidden until this fleet has a paid plan. Use{" "}
                    <strong>Book / request quote</strong> to connect through
                    Simba Tasker.
                  </p>
                )}
                <p className="log-hint" style={{ margin: "8px 0 0" }}>
                  {(Number(rating.average) || 0).toFixed(1)} ★ average ·{" "}
                  {completed} completed job{completed === 1 ? "" : "s"}
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : (
        loaded ? (
          <p className="logistics-empty">Asset not found</p>
        ) : (
          <LogisticsDetailSkeleton label="Loading asset" />
        )
      )}
    </LogisticsPageShell>
  );
}
