import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { buildPublicAssetUrl, defaultImage } from "../../utils/ImagePath";
import {
  formatTons,
  normalizePlateInput,
  toTons,
} from "../../utils/logisticsIdentity";
import {
  TRUCK_BODY_TYPES,
  assetBodyType,
  capacityToTier,
  isTruckBodyType,
} from "../../utils/logisticVehicleWeight";
import "./logistics.css";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const LEGACY_TYPE_LABELS = new Set([
  "below 5 ton truck",
  "10 ton tipper",
  "curtain-side truck",
  "tipper",
  "flatbed",
  "refrigerated",
  "container",
  "regular",
]);

function firstCapabilityLabel(asset) {
  return (
    (asset?.capabilities || []).find((c) => !String(c).includes(":")) || ""
  );
}

const AVAIL_LABEL = {
  available_now: "Available now",
  returning_empty: "Returning empty",
  scheduled: "Scheduled",
  on_job: "On job",
  offline: "Offline",
};

const DOC_LABELS = {
  ownership: "Ownership papers",
  insurance: "Insurance",
  rego: "Rego / road licensing",
  roadworthy: "Roadworthy / fitness",
  pollution: "Road / pollution",
  vin_photo: "VIN / chassis plate photo",
  other: "Document",
};

const VEHICLE_DOC_DEFS = [
  { id: "ownership", label: "Ownership papers", hint: "Proof you own this truck" },
  { id: "insurance", label: "Insurance", hint: "Current cover" },
  { id: "rego", label: "Rego / road licensing", hint: "Road papers" },
  { id: "roadworthy", label: "Roadworthy / fitness", hint: "Tap to upload" },
];

const EQUIPMENT_DOC_DEFS = [
  { id: "ownership", label: "Ownership / proof of purchase", hint: "Invoice or title" },
  { id: "insurance", label: "Insurance", hint: "Current cover" },
  { id: "pollution", label: "Road / pollution", hint: "Where required" },
  { id: "vin_photo", label: "VIN / chassis plate photo", hint: "Tap to upload" },
];

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function isDocExpiredOrToday(expires) {
  if (!expires) return false;
  const exp = new Date(expires);
  if (Number.isNaN(exp.getTime())) return false;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return exp <= end;
}

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

function assetVin(asset) {
  const hit = (asset?.capabilities || []).find((c) =>
    String(c).toLowerCase().startsWith("vin:")
  );
  return hit ? String(hit).slice(4) : "";
}

function operatorId(op) {
  return String(op?._id || op || "");
}

function operatorName(op) {
  return op?.full_name || op?.email || "Operator";
}

const emptyEdit = () => ({
  name: "",
  make: "",
  model: "",
  year: "",
  registration: "",
  chassis_number: "",
  vin: "",
  vehicle_type: "regular",
  capacity_value: "",
  capacity_unit: "tons",
  carriage_length_ft: "",
  carriage_width_ft: "",
  carriage_height_ft: "",
  direct_booking_enabled: true,
});

function formFromAsset(next) {
  const body = assetBodyType(next);
  const raw = firstCapabilityLabel(next);
  let vehicle_type = "regular";
  if (body && TRUCK_BODY_TYPES.includes(body)) {
    vehicle_type = body;
  } else if (isTruckBodyType(raw)) {
    vehicle_type =
      TRUCK_BODY_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase()) ||
      "regular";
  }
  return {
    name: next.name || "",
    make: next.make || "",
    model: next.model || "",
    year: next.year != null ? String(next.year) : "",
    registration: normalizePlateInput(next.registration || ""),
    chassis_number: normalizePlateInput(next.chassis_number || ""),
    vin: assetVin(next),
    vehicle_type,
    capacity_value:
      next.capacity?.value != null ? String(next.capacity.value) : "",
    capacity_unit: next.capacity?.unit || "tons",
    carriage_length_ft:
      next.carriage?.length_m != null ? String(next.carriage.length_m) : "",
    carriage_width_ft:
      next.carriage?.width_m != null ? String(next.carriage.width_m) : "",
    carriage_height_ft:
      next.carriage?.height_m != null ? String(next.carriage.height_m) : "",
    direct_booking_enabled: next.direct_booking_enabled !== false,
  };
}

export default function LogisticsOwnerAsset() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const [asset, setAsset] = useState(null);
  const [operators, setOperators] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickOperator, setPickOperator] = useState("");
  const [form, setForm] = useState(emptyEdit);
  const [keptPhotos, setKeptPhotos] = useState([]); // { path, url }
  const [newPhotos, setNewPhotos] = useState([]); // { file, url }
  const [docDrafts, setDocDrafts] = useState({}); // type -> { url, name, expires, file }
  const [idErrors, setIdErrors] = useState({
    registration: "",
    chassis_number: "",
  });

  const capacityTons = toTons(form.capacity_value, form.capacity_unit);

  const resetPhotoEditors = (next) => {
    setKeptPhotos(
      (next?.photos || [])
        .map((path) => {
          const url = assetPhotoUrl(path);
          return url ? { path, url } : null;
        })
        .filter(Boolean)
    );
    setNewPhotos((prev) => {
      prev.forEach((p) => {
        if (p?.url) URL.revokeObjectURL(p.url);
      });
      return [];
    });
  };

  const resetDocEditors = (next) => {
    const defs =
      next?.kind === "equipment" ? EQUIPMENT_DOC_DEFS : VEHICLE_DOC_DEFS;
    const existingByType = new Map(
      (next?.documents || []).map((d) => [String(d.type || "other"), d])
    );
    const drafts = {};
    for (const def of defs) {
      const existing = existingByType.get(def.id);
      drafts[def.id] = {
        url: existing?.url || null,
        name: existing?.name || null,
        expires: toDateInput(existing?.expires),
        file: null,
      };
      existingByType.delete(def.id);
    }
    for (const [type, existing] of existingByType) {
      drafts[type] = {
        url: existing?.url || null,
        name: existing?.name || null,
        expires: toDateInput(existing?.expires),
        file: null,
      };
    }
    setDocDrafts(drafts);
  };

  const load = async () => {
    setLoading(true);
    const [assetRes, subRes] = await Promise.all([
      dispatch(LogisticsActions.getAsset(id)),
      dispatch(LogisticsActions.listSubUsers()),
    ]);
    const next = assetRes?.payload?.data?.asset || null;
    const ops =
      assetRes?.payload?.data?.operators ||
      next?.assigned_sub_user_ids ||
      [];
    setAsset(next);
    setOperators(Array.isArray(ops) ? ops.filter((o) => o && typeof o === "object") : []);
    setDrivers(subRes?.payload?.data?.drivers || []);
    if (next) {
      setForm(formFromAsset(next));
      resetPhotoEditors(next);
      resetDocEditors(next);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    return () => {
      setNewPhotos((prev) => {
        prev.forEach((p) => {
          if (p?.url) URL.revokeObjectURL(p.url);
        });
        return [];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (key) => (e) => {
    let value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (key === "registration" || key === "chassis_number") {
      value = normalizePlateInput(value);
      setIdErrors((err) => ({ ...err, [key]: "" }));
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
    if (!editing) return undefined;
    const registration = form.registration;
    const chassis_number = form.chassis_number;
    if (!registration && !chassis_number) {
      setIdErrors({ registration: "", chassis_number: "" });
      return undefined;
    }
    const t = setTimeout(async () => {
      const res = await dispatch(
        LogisticsActions.checkAssetIdentity({
          registration: registration || undefined,
          chassis_number: chassis_number || undefined,
          exclude_id: id,
        })
      );
      const data = res?.payload?.data;
      if (!data) return;
      setIdErrors({
        registration: data.registration_taken
          ? "This registration plate is already on Simba"
          : "",
        chassis_number: data.chassis_taken
          ? "This chassis number is already on Simba"
          : "",
      });
    }, 400);
    return () => clearTimeout(t);
  }, [dispatch, editing, form.registration, form.chassis_number, id]);

  const startEdit = () => {
    resetPhotoEditors(asset);
    resetDocEditors(asset);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    if (asset) {
      setForm(formFromAsset(asset));
      resetPhotoEditors(asset);
      resetDocEditors(asset);
    }
  };

  const onAddPhotos = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setNewPhotos((prev) => {
      const next = [...prev];
      for (const file of picked) {
        if (keptPhotos.length + next.length >= 12) break;
        next.push({ file, url: URL.createObjectURL(file), name: file.name });
      }
      return next;
    });
  };

  const removeKeptPhoto = (idx) => {
    setKeptPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewPhoto = (idx) => {
    setNewPhotos((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return copy;
    });
  };

  const onPickDoc = (type, file) => {
    setDocDrafts((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        file,
        name: file.name,
      },
    }));
  };

  const onDocExpiry = (type, expires) => {
    setDocDrafts((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        expires,
      },
    }));
  };

  const assignedIds = useMemo(
    () => new Set(operators.map((o) => operatorId(o))),
    [operators]
  );

  const availableDrivers = useMemo(
    () => drivers.filter((d) => !assignedIds.has(String(d._id))),
    [drivers, assignedIds]
  );

  const save = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      toast.error("Name is required");
      return;
    }
    if ((asset?.kind === "vehicle" || asset?.kind === "cab") && !String(form.registration || "").trim()) {
      toast.error("Registration plate is required");
      return;
    }
    if (idErrors.registration || idErrors.chassis_number) {
      toast.error("Fix registration or chassis conflicts before saving");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const fields = {
        name: String(form.name).trim(),
        make: form.make || "",
        model: form.model || "",
        year: form.year || "",
        registration: form.registration || "",
        chassis_number: form.chassis_number || "",
        vin: form.vin || "",
        vehicle_type:
          asset?.kind !== "equipment" ? form.vehicle_type || "regular" : "",
        capacity_value: form.capacity_value || "",
        capacity_unit: form.capacity_unit || "tons",
        carriage_length_ft: form.carriage_length_ft || "",
        carriage_width_ft: form.carriage_width_ft || "",
        carriage_height_ft: form.carriage_height_ft || "",
        direct_booking_enabled: form.direct_booking_enabled ? "true" : "false",
        keep_photos: JSON.stringify(keptPhotos.map((p) => p.path)),
      };
      Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
      newPhotos.forEach((p) => {
        if (p?.file) fd.append("photos", p.file);
      });

      const docTypes = [];
      const docExpires = [];
      const docNames = [];
      const expiryUpdates = [];
      Object.entries(docDrafts || {}).forEach(([type, entry]) => {
        if (entry?.file) {
          fd.append("documents", entry.file);
          docTypes.push(type);
          docExpires.push(entry.expires || "");
          docNames.push(entry.name || entry.file.name || type);
        } else if (entry?.url) {
          expiryUpdates.push({ type, expires: entry.expires || "" });
        }
      });
      if (docTypes.length) {
        fd.append("document_types", JSON.stringify(docTypes));
        fd.append("document_expires", JSON.stringify(docExpires));
        fd.append("document_names", JSON.stringify(docNames));
      }
      if (expiryUpdates.length) {
        fd.append("document_expiry_updates", JSON.stringify(expiryUpdates));
      }

      const res = await dispatch(
        LogisticsActions.patchAsset({ id, payload: fd })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Details updated");
        setEditing(false);
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not update");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!asset) return;
    const currentlyActive = Number(asset.is_active) === 1;
    const nextActive = currentlyActive ? 0 : 1;
    if (
      currentlyActive &&
      !window.confirm(
        "Disable this equipment? Customers will no longer see it in Search or Hub."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.patchAsset({
          id,
          payload: { is_active: nextActive },
        })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success(
          nextActive
            ? "Enabled — visible in customer search again"
            : "Disabled — hidden from customer search"
        );
        await load();
      } else if (res?.payload?.data?.code === "PLAN_LIMIT") {
        toast.error(`${res.payload.message} Tap to open Plans.`, {
          onClick: () => window.location.assign("/logistics/owner/subscription"),
        });
      } else {
        toast.error(res?.payload?.message || "Could not update listing");
      }
    } finally {
      setSaving(false);
    }
  };

  const addOperator = async () => {
    if (!pickOperator) {
      toast.error("Select an operator to assign");
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.assignOperator({ id, sub_user_id: pickOperator })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Operator assigned");
        setPickOperator("");
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not assign");
      }
    } finally {
      setSaving(false);
    }
  };

  const removeOperator = async (subUserId) => {
    if (
      !window.confirm(
        "Remove this operator from the equipment? They will no longer see jobs for it."
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.unassignOperator({
          id,
          sub_user_id: subUserId,
        })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Operator removed");
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not remove");
      }
    } finally {
      setSaving(false);
    }
  };

  const photos = (asset?.photos || [])
    .map(assetPhotoUrl)
    .filter(Boolean);
  const documents = Array.isArray(asset?.documents) ? asset.documents : [];
  const active = Number(asset?.is_active) === 1;
  const vin = assetVin(asset);
  const isTruck = asset?.kind !== "equipment";
  const docDefs = useMemo(() => {
    const base =
      asset?.kind === "equipment" ? EQUIPMENT_DOC_DEFS : VEHICLE_DOC_DEFS;
    const known = new Set(base.map((d) => d.id));
    const extras = Object.keys(docDrafts || {})
      .filter((id) => !known.has(id))
      .map((id) => ({
        id,
        label: DOC_LABELS[id] || id,
        hint: "Uploaded document",
      }));
    return [...base, ...extras];
  }, [asset?.kind, docDrafts]);
  const kindLabel = isTruck ? "Truck" : "Equipment";
  const category =
    asset?.category_id?.name ||
    asset?.services?.[0] ||
    (isTruck ? "Logistic" : "Plant");
  const typeLabel = (() => {
    if (!isTruck) return firstCapabilityLabel(asset) || kindLabel;
    const body = assetBodyType(asset);
    if (body) return body;
    const raw = firstCapabilityLabel(asset);
    if (raw && !LEGACY_TYPE_LABELS.has(String(raw).toLowerCase())) return raw;
    const tons =
      asset?.capacity?.value != null
        ? toTons(asset.capacity.value, asset.capacity.unit || "tons")
        : null;
    const tier = capacityToTier(tons);
    if (tier) return tier;
    return raw || kindLabel;
  })();
  const capacityTierLabel = (() => {
    if (!isTruck || asset?.capacity?.value == null) return null;
    return capacityToTier(
      toTons(asset.capacity.value, asset.capacity.unit || "tons")
    );
  })();
  const avail =
    AVAIL_LABEL[asset?.availability?.state] ||
    asset?.availability?.state ||
    "—";

  return (
    <LogisticsPageShell
      title={asset?.name || "Equipment"}
      crumbLabel={asset?.name || "Equipment"}
      midCrumb={{ to: "/logistics/owner/fleet", label: "Fleet" }}
      homeTo="/logistics/owner"
    >
      {loading ? (
        <p className="logistics-empty">Loading…</p>
      ) : !asset ? (
        <div className="log-fleet-empty">
          <b>Equipment not found</b>
          <p>It may have been removed, or you don’t own this asset.</p>
          <Link
            className="logistics-cta logistics-cta--primary"
            to="/logistics/owner/fleet"
          >
            Back to fleet
          </Link>
        </div>
      ) : (
        <>
          <div className="log-form-card log-owner-asset">
            <div className="log-owner-asset__head">
              <div>
                <div className="log-result-row__top" style={{ marginBottom: 6 }}>
                  <h2 className="log-asset-detail__name" style={{ margin: 0 }}>
                    {asset.name}
                  </h2>
                  <span
                    className={`log-chip log-chip--${active ? "active" : "closed"}`}
                  >
                    {active ? "Listed" : asset.plan_locked ? "Plan limit" : "Disabled"}
                  </span>
                </div>
                <p className="log-lead" style={{ margin: 0 }}>
                  {kindLabel} · {category}
                  {typeLabel ? ` · ${typeLabel}` : ""}
                  {isTruck && capacityTierLabel && capacityTierLabel !== typeLabel
                    ? ` · ${capacityTierLabel}`
                    : ""}
                </p>
              </div>
              <div className="log-detail-actions">
                {!editing ? (
                  <>
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--primary"
                      onClick={startEdit}
                      disabled={saving}
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      className={`logistics-cta ${
                        active
                          ? "logistics-cta--danger"
                          : "logistics-cta--primary"
                      }`}
                      onClick={toggleActive}
                      disabled={saving}
                    >
                      {active ? "Disable" : "Enable"}
                    </button>
                  </>
                ) : null}
                <Link
                  className="logistics-cta logistics-cta--ghost"
                  to="/logistics/owner/fleet"
                >
                  Back to fleet
                </Link>
              </div>
            </div>

            {!active && asset.plan_locked ? (
              <div className="log-callout log-callout--warn" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Disabled by your plan limit</strong> — hidden from customers, and its
                  operators can't go online or quote with it. Upgrade, or{" "}
                  <Link to="/logistics/owner/subscription">choose which units stay active</Link>.
                </p>
              </div>
            ) : !active ? (
              <div className="log-callout log-callout--warn" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Hidden from customers</strong> — not shown in Hub or
                  Book / Search until you enable it again.
                </p>
              </div>
            ) : null}

            {editing ? (
              <form className="log-form-grid" onSubmit={save} noValidate>
                <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                  Edit details
                </p>
                <label className="log-field">
                  <span className="log-fl">
                    Name <span className="log-req">*</span>
                  </span>
                  <input value={form.name} onChange={set("name")} required />
                </label>
                <label
                  className={`log-field${idErrors.registration ? " log-field--error" : ""}`}
                >
                  <span className="log-fl">
                    Registration plate
                    {asset?.kind === "vehicle" ? (
                      <span className="log-req"> *</span>
                    ) : null}
                  </span>
                  <input
                    value={form.registration}
                    onChange={set("registration")}
                    placeholder="AEB1234"
                    autoCapitalize="characters"
                    aria-invalid={!!idErrors.registration}
                  />
                  {idErrors.registration ? (
                    <span className="log-field-error">
                      {idErrors.registration}
                    </span>
                  ) : null}
                </label>
                <label className="log-field">
                  <span className="log-fl">Make</span>
                  <input value={form.make} onChange={set("make")} />
                </label>
                <label className="log-field">
                  <span className="log-fl">Model</span>
                  <input value={form.model} onChange={set("model")} />
                </label>
                <label className="log-field">
                  <span className="log-fl">Year</span>
                  <input
                    type="number"
                    min="1980"
                    max="2100"
                    value={form.year}
                    onChange={set("year")}
                  />
                </label>
                <label
                  className={`log-field${idErrors.chassis_number ? " log-field--error" : ""}`}
                >
                  <span className="log-fl">Chassis number</span>
                  <input
                    value={form.chassis_number}
                    onChange={set("chassis_number")}
                    autoCapitalize="characters"
                    aria-invalid={!!idErrors.chassis_number}
                  />
                  {idErrors.chassis_number ? (
                    <span className="log-field-error">
                      {idErrors.chassis_number}
                    </span>
                  ) : null}
                </label>
                <label className="log-field">
                  <span className="log-fl">VIN</span>
                  <input value={form.vin} onChange={set("vin")} />
                </label>
                {isTruck ? (
                  <label className="log-field">
                    <span className="log-fl">Type</span>
                    <select
                      value={form.vehicle_type}
                      onChange={set("vehicle_type")}
                    >
                      {TRUCK_BODY_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="log-field">
                  <span className="log-fl">Capacity</span>
                  <div className="log-weight-row">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={form.capacity_value}
                      onChange={set("capacity_value")}
                    />
                    <select
                      value={form.capacity_unit}
                      onChange={set("capacity_unit")}
                    >
                      <option value="tons">tons</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  {form.capacity_unit === "kg" && capacityTons != null ? (
                    <span className="log-weight-hint">
                      Stored as <strong>{formatTons(capacityTons)}</strong>
                    </span>
                  ) : null}
                  {isTruck && capacityTons != null && capacityTons > 0 ? (
                    <span className="log-weight-hint">
                      Matches customer{" "}
                      <strong>
                        Vehicle needed: {capacityToTier(capacityTons)}
                      </strong>
                    </span>
                  ) : null}
                </div>
                <label className="log-field">
                  <span className="log-fl">Carriage length (ft)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.carriage_length_ft}
                    onChange={set("carriage_length_ft")}
                  />
                </label>
                <label className="log-field">
                  <span className="log-fl">Carriage width (ft)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.carriage_width_ft}
                    onChange={set("carriage_width_ft")}
                  />
                </label>
                <label className="log-field">
                  <span className="log-fl">Carriage height (ft)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.carriage_height_ft}
                    onChange={set("carriage_height_ft")}
                  />
                </label>

                <div className="log-field log-field--full">
                  <span className="log-fl">Photos</span>
                  <div className="log-photo-slots">
                    {keptPhotos.map((item, idx) => (
                      <div
                        key={`keep-${item.path}-${idx}`}
                        className="log-photo-slot log-photo-slot--filled"
                      >
                        <img
                          src={item.url}
                          alt=""
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultImage;
                          }}
                        />
                        <button
                          type="button"
                          className="log-photo-slot__remove"
                          aria-label="Remove photo"
                          onClick={() => removeKeptPhoto(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {newPhotos.map((p, idx) => (
                      <div
                        key={`new-${p.url}`}
                        className="log-photo-slot log-photo-slot--filled"
                      >
                        <img src={p.url} alt="" />
                        <button
                          type="button"
                          className="log-photo-slot__remove"
                          aria-label="Remove photo"
                          onClick={() => removeNewPhoto(idx)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {keptPhotos.length + newPhotos.length < 12 ? (
                      <label className="log-photo-slot log-photo-slot--add">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          hidden
                          onChange={onAddPhotos}
                        />
                        <span className="log-photo-slot__plus">+</span>
                        <span className="log-photo-slot__label">Add</span>
                      </label>
                    ) : null}
                  </div>
                  <span className="log-weight-hint">
                    Remove photos with ×, or add new ones before saving.
                  </span>
                </div>

                <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                  Documents{" "}
                  <span className="log-sect__soft">(verification)</span>
                </p>
                <p className="log-hint log-field--full">
                  Upload PDF or image files and set an expiry date. Owner and
                  assigned operators get a daily alert when a document expires
                  today or is already past due.
                </p>
                <div className="log-field--full">
                  <ul className="log-doc-list">
                    {docDefs.map((d) => {
                      const entry = docDrafts[d.id] || {};
                      const fileLabel =
                        entry.name ||
                        (entry.url
                          ? String(entry.url).split("/").pop()
                          : null);
                      return (
                        <li key={d.id} className="log-doc-row">
                          <span className="log-doc-row__icon" aria-hidden="true">
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            >
                              <path d="M7 3h7l5 5v13H7V3Z" />
                              <path d="M14 3v5h5" />
                            </svg>
                          </span>
                          <span className="log-doc-row__body">
                            <b>{d.label}</b>
                            <p>{fileLabel || d.hint}</p>
                          </span>
                          <label className="log-doc-row__expiry">
                            <span>Expiry date</span>
                            <LogisticsDateInput
                              value={entry.expires || ""}
                              onChange={(e) =>
                                onDocExpiry(d.id, e.target.value)
                              }
                            />
                          </label>
                          {entry.url && !entry.file ? (
                            <a
                              className="logistics-cta logistics-cta--ghost"
                              href={assetPhotoUrl(entry.url) || entry.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open
                            </a>
                          ) : null}
                          <label
                            className="log-doc-row__add"
                            title={fileLabel ? "Replace file" : "Upload"}
                          >
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              hidden
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onPickDoc(d.id, f);
                                e.target.value = "";
                              }}
                            />
                            {fileLabel ? "↻" : "+"}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <label className="log-check log-field--full">
                  <input
                    type="checkbox"
                    checked={form.direct_booking_enabled}
                    onChange={set("direct_booking_enabled")}
                  />
                  Allow direct booking from Hub / Search
                </label>
                <div
                  className="log-form-actions log-field--full"
                  style={{ justifyContent: "flex-start" }}
                >
                  <button
                    type="submit"
                    className="logistics-cta logistics-cta--primary"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--ghost"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="log-sect">Details</p>
                <div className="log-detail-grid">
                  <div className="log-detail-item">
                    <span className="log-fl">Type</span>
                    <strong>{typeLabel}</strong>
                  </div>
                  {isTruck && capacityTierLabel ? (
                    <div className="log-detail-item">
                      <span className="log-fl">Vehicle needed tier</span>
                      <strong>{capacityTierLabel}</strong>
                    </div>
                  ) : null}
                  <div className="log-detail-item">
                    <span className="log-fl">Category</span>
                    <strong>
                      {String(category).charAt(0).toUpperCase() +
                        String(category).slice(1)}
                    </strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Make</span>
                    <strong>{asset.make || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Model</span>
                    <strong>{asset.model || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Year</span>
                    <strong>{asset.year || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Registration plate</span>
                    <strong>{asset.registration || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Chassis number</span>
                    <strong>{asset.chassis_number || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">VIN</span>
                    <strong>{vin || "—"}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Capacity</span>
                    <strong>
                      {asset.capacity?.value != null
                        ? `${asset.capacity.value} ${asset.capacity.unit || ""}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Availability</span>
                    <strong>{avail}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Carriage (L × W × H)</span>
                    <strong>
                      {asset.carriage?.length_m != null ||
                      asset.carriage?.width_m != null ||
                      asset.carriage?.height_m != null
                        ? `${asset.carriage?.length_m ?? "—"} × ${
                            asset.carriage?.width_m ?? "—"
                          } × ${asset.carriage?.height_m ?? "—"} ft`
                        : "—"}
                    </strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Direct booking</span>
                    <strong>
                      {asset.direct_booking_enabled !== false ? "Yes" : "No"}
                    </strong>
                  </div>
                  {asset.price_hint?.amount != null ? (
                    <div className="log-detail-item">
                      <span className="log-fl">Price hint</span>
                      <strong>
                        {asset.price_hint.currency || "USD"}{" "}
                        {asset.price_hint.amount}
                      </strong>
                    </div>
                  ) : null}
                </div>

                <p className="log-sect">Photos</p>
                {photos.length ? (
                  <div className="log-job-gallery">
                    <div className="log-job-gallery__grid">
                      {photos.map((src, idx) => (
                        <a
                          key={`${src}-${idx}`}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={src}
                            alt={`${asset.name} ${idx + 1}`}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = defaultImage;
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="log-hint">
                    No photos yet. Add photos when creating or editing this
                    equipment.
                  </p>
                )}

                <p className="log-sect">
                  Documents{" "}
                  <span className="log-sect__soft">(verification)</span>
                </p>
                {documents.length ? (
                  <ul className="log-doc-list">
                    {documents.map((doc, idx) => {
                      const expired = isDocExpiredOrToday(doc.expires);
                      return (
                      <li
                        key={doc.url || doc.type || idx}
                        className="log-doc-row"
                      >
                        <span className="log-doc-row__icon" aria-hidden="true">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M7 3h7l5 5v13H7V3Z" />
                            <path d="M14 3v5h5" />
                          </svg>
                        </span>
                        <span className="log-doc-row__body">
                          <b>
                            {DOC_LABELS[doc.type] || doc.type || "Document"}
                          </b>
                          <p>
                            {doc.url
                              ? String(doc.url).split("/").pop()
                              : "Uploaded"}
                            {doc.expires
                              ? ` · expires ${new Date(
                                  doc.expires
                                ).toLocaleDateString()}`
                              : ""}
                          </p>
                        </span>
                        {expired ? (
                          <span className="log-chip">Expired / due</span>
                        ) : null}
                        {doc.url ? (
                          <a
                            className="logistics-cta logistics-cta--ghost"
                            href={assetPhotoUrl(doc.url) || doc.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="log-chip log-chip--active">Added</span>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="log-hint">
                    No verification documents on file yet. Use Edit to upload
                    ownership, insurance and road papers with expiry dates.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="log-form-card log-owner-asset" style={{ marginTop: 16 }}>
            <div className="log-owner-asset__head">
              <div>
                <h2 className="log-sect" style={{ margin: 0 }}>
                  Operators
                </h2>
                <p className="log-hint" style={{ margin: "6px 0 0" }}>
                  Many-to-many: assign one or more operators. One operator can
                  cover several trucks or machines.
                </p>
              </div>
              <Link
                className="logistics-cta logistics-cta--ghost"
                to="/logistics/owner/operators"
              >
                Manage operators
              </Link>
            </div>

            {operators.length ? (
              <ul className="log-doc-list" style={{ marginBottom: 14 }}>
                {operators.map((op) => (
                  <li key={operatorId(op)} className="log-doc-row">
                    <span className="log-doc-row__icon" aria-hidden="true">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
                      </svg>
                    </span>
                    <span className="log-doc-row__body">
                      <b>{operatorName(op)}</b>
                      <p>
                        {[op.email, op.phone_number].filter(Boolean).join(" · ") ||
                          "Assigned operator"}
                      </p>
                    </span>
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--danger"
                      disabled={saving}
                      onClick={() => removeOperator(operatorId(op))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="log-hint">No operator assigned yet.</p>
            )}

            <div className="log-owner-assign">
              <label className="log-field" style={{ margin: 0, flex: 1 }}>
                <span className="log-fl">
                  {isTruck && operators.length
                    ? "Replace with operator"
                    : "Add operator"}
                </span>
                <select
                  value={pickOperator}
                  onChange={(e) => setPickOperator(e.target.value)}
                  disabled={!availableDrivers.length || saving}
                >
                  <option value="">
                    {drivers.length
                      ? availableDrivers.length
                        ? "Select operator…"
                        : "All operators already assigned"
                      : "No operators yet — invite from Operators"}
                  </option>
                  {availableDrivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.full_name || d.email}
                      {d.email ? ` · ${d.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="logistics-cta logistics-cta--primary"
                onClick={addOperator}
                disabled={saving || !pickOperator}
              >
                {isTruck && operators.length ? "Assign" : "Add operator"}
              </button>
            </div>
          </div>
        </>
      )}
    </LogisticsPageShell>
  );
}
