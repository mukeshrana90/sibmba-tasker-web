import { useEffect, useMemo, useState } from "react";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LogisticsPlanBanner, {
  isPlanLimitError,
} from "../../CommanComponents/LogisticsPlanBanner";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";
import LogisticsCategoryTiles, {
  isCabCategory,
  isPlantCategory,
} from "../../CommanComponents/LogisticsCategoryTiles";
import {
  DEFAULT_CAB_CLASSES,
  useLogisticsConfig,
} from "../../CommanComponents/useLogisticsConfig";
import {
  LogisticsPickField,
  EquipmentPickerModal,
  SubtypePickerModal,
} from "../../CommanComponents/LogisticsEquipmentPickers";
import {
  formatTons,
  normalizePlateInput,
  toTons,
} from "../../utils/logisticsIdentity";
import {
  TRUCK_BODY_TYPES,
  capacityToTier,
} from "../../utils/logisticVehicleWeight";
import {
  parseLogisticsMoney,
  sanitizeMoneyInput,
} from "../../utils/logisticsMoney";
import "./logistics.css";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const AVAIL_LABEL = {
  available_now: "Available",
  returning_empty: "Returning empty",
  scheduled: "Scheduled",
  on_job: "On job",
  offline: "Offline",
};

const AVAIL_TONE = {
  available_now: "active",
  returning_empty: "pending",
  scheduled: "active",
  on_job: "progress",
  offline: "closed",
};

const LOGISTIC_DOCS = [
  { id: "ownership", label: "Ownership papers", hint: "Proof you own this truck" },
  { id: "insurance", label: "Insurance", hint: "Current cover" },
  { id: "rego", label: "Rego / road licensing", hint: "Road papers" },
  { id: "roadworthy", label: "Roadworthy / fitness", hint: "Tap to upload" },
];

// Cab (passenger taxi) documents
const CAB_DOCS = [
  { id: "ownership", label: "Ownership papers", hint: "Proof you own this cab" },
  { id: "insurance", label: "Insurance", hint: "Passenger cover" },
  { id: "rego", label: "Rego / road licensing", hint: "Road papers" },
  { id: "taxi_permit", label: "Taxi / PSV permit", hint: "Permit to carry passengers" },
];

const PLANT_DOCS = [
  { id: "ownership", label: "Ownership / proof of purchase", hint: "Invoice or title" },
  { id: "insurance", label: "Insurance", hint: "Current cover" },
  { id: "pollution", label: "Road / pollution", hint: "Where required" },
  { id: "vin_photo", label: "VIN / chassis plate photo", hint: "Tap to upload" },
];

const emptyForm = () => ({
  category: "logistic",
  name: "",
  cab_class: "car",
  seats: "4",
  vehicle_type: "regular",
  capacity_value: "",
  capacity_unit: "tons",
  make: "",
  model: "",
  year: "",
  registration: "",
  chassis_number: "",
  vin: "",
  carriage_length_ft: "",
  carriage_width_ft: "",
  carriage_height_ft: "",
  needs_operator: "yes",
  operators_needed: "1",
  equipment: "Tractor",
  subtype: "Compact",
  size_class: "",
  engine_type: "Diesel",
  weight_kg: "",
  mobility: "Wheeled",
  motor_vehicle: false,
  operating_range: "",
  price_hour: "",
  price_day: "",
  location: "",
  location_coords: null,
  direct_booking_enabled: true,
  photos: [],
  docs: {},
});

function formatCapacity(capacity) {
  if (capacity?.value == null || capacity.value === "") return null;
  return `${capacity.value} ${capacity.unit || "tons"}`;
}

function assetVin(asset) {
  const hit = (asset?.capabilities || []).find((c) =>
    String(c).toLowerCase().startsWith("vin:")
  );
  return hit ? String(hit).slice(4) : "";
}

function matchesFleetFilters(asset, filters) {
  if (filters.kind === "vehicle" && asset.kind !== "vehicle") return false;
  if (filters.kind === "equipment" && asset.kind !== "equipment") return false;
  if (filters.kind === "cab" && asset.kind !== "cab") return false;

  const q = String(filters.q || "").trim().toLowerCase();
  if (!q) return true;

  const hay = [
    asset.name,
    asset.registration,
    asset.chassis_number,
    assetVin(asset),
    asset.make,
    asset.model,
    asset.year != null ? String(asset.year) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

const emptyFleetFilters = () => ({ q: "", kind: "vehicle" });
const FLEET_PAGE_SIZE = 10;

function PhotoSlots({ files, onAdd, onRemove }) {
  return (
    <div className="log-field log-field--full">
      <span className="log-fl">Photos</span>
      <div className="log-photo-slots">
        {files.map((f, idx) => (
          <div key={f.url} className="log-photo-slot log-photo-slot--filled">
            <img src={f.url} alt={`Asset ${idx + 1}`} />
            <button
              type="button"
              className="log-photo-slot__remove"
              aria-label="Remove photo"
              onClick={() => onRemove(idx)}
            >
              ×
            </button>
          </div>
        ))}
        {files.length < 6 ? (
          <label className="log-photo-slot log-photo-slot--add">
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onAdd}
            />
            {files.length === 0 ? (
              <span className="log-photo-slot__placeholder" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M3 7h13l5 5v5H3V7Z" />
                  <path d="M16 7v5h5" />
                  <circle cx="7.5" cy="17.5" r="1.5" />
                  <circle cx="17.5" cy="17.5" r="1.5" />
                </svg>
              </span>
            ) : null}
            <span className="log-photo-slot__plus" aria-hidden="true">
              +
            </span>
            <span className="log-photo-slot__label">
              {files.length ? "Add" : "Add photos"}
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

function DocRows({ items, docs, onPick, onExpiry }) {
  return (
    <ul className="log-doc-list">
      {items.map((d) => {
        const entry = docs[d.id];
        const fileLabel = entry?.name || entry?.file?.name;
        return (
          <li key={d.id} className="log-doc-row">
            <span className="log-doc-row__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
                value={entry?.expires || ""}
                onChange={(e) => onExpiry?.(d.id, e.target.value)}
              />
            </label>
            <label className="log-doc-row__add" title={fileLabel ? "Replace file" : "Upload"}>
              <input
                type="file"
                accept=".pdf,image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPick(d.id, f);
                  e.target.value = "";
                }}
              />
              {fileLabel ? "↻" : "+"}
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function LogisticsFleet() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const showAddByRoute = location.pathname.endsWith("/fleet/add");

  const [assets, setAssets] = useState([]);
  // { eligible, pinned_asset_id, featured_asset_id } — Hub "Top logistics providers"
  const [hubFeature, setHubFeature] = useState(null);
  const [featuringId, setFeaturingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(showAddByRoute);
  const [form, setForm] = useState(emptyForm);
  const [equipOpen, setEquipOpen] = useState(false);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [q, setQ] = useState("");
  // ?kind=cab (owner sidebar "Cabs") opens the list filtered to cabs
  const urlKind = new URLSearchParams(location.search).get("kind");
  const initialKind = ["vehicle", "equipment", "cab", "all"].includes(urlKind)
    ? urlKind
    : "vehicle";
  const [kind, setKind] = useState(initialKind);
  const { cabEnabled } = useLogisticsConfig();
  const [applied, setApplied] = useState(() => ({
    ...emptyFleetFilters(),
    kind: initialKind,
  }));
  // Sidebar My Vehicles ↔ Cabs share this route; follow ?kind= changes
  useEffect(() => {
    setKind(initialKind);
    setApplied((prev) => ({ ...prev, kind: initialKind }));
  }, [initialKind]);
  const [page, setPage] = useState(1);
  const [idErrors, setIdErrors] = useState({
    registration: "",
    chassis_number: "",
  });

  const plant = isPlantCategory(form.category);
  const cab = isCabCategory(form.category);
  const cabMeta =
    DEFAULT_CAB_CLASSES.find((c) => c.id === form.cab_class) || DEFAULT_CAB_CLASSES[2];
  const capacityTons = toTons(form.capacity_value, form.capacity_unit);

  const filteredAssets = useMemo(
    () => assets.filter((a) => matchesFleetFilters(a, applied)),
    [assets, applied]
  );

  const total = filteredAssets.length;
  const totalPages = Math.max(1, Math.ceil(total / FLEET_PAGE_SIZE) || 1);
  const showPagination = total > FLEET_PAGE_SIZE;
  const pageAssets = useMemo(() => {
    const start = (page - 1) * FLEET_PAGE_SIZE;
    return filteredAssets.slice(start, start + FLEET_PAGE_SIZE);
  }, [filteredAssets, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasFilters = Boolean(applied.q || applied.kind !== "vehicle");

  const applyFilters = (e) => {
    e.preventDefault();
    setApplied({ q: q.trim(), kind });
    setPage(1);
  };

  const clearFilters = () => {
    setQ("");
    setKind("all");
    setApplied(emptyFleetFilters());
    setPage(1);
  };

  const load = async () => {
    setLoading(true);
    const res = await dispatch(LogisticsActions.listAssets());
    setAssets(res?.payload?.data?.assets || []);
    setHubFeature(res?.payload?.data?.hub_feature || null);
    setLoading(false);
  };

  const toggleFeature = async (asset, featured) => {
    if (!hubFeature?.eligible) {
      toast.info(
        "Featuring a truck in the Hub is a Paid plan feature. Tap to see plans.",
        { onClick: () => navigate("/logistics/owner/subscription") }
      );
      return;
    }
    setFeaturingId(asset._id);
    try {
      const res = await dispatch(
        LogisticsActions.featureAsset({ id: asset._id, featured })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success(res.payload.message);
        setHubFeature(res.payload.data?.hub_feature || null);
      } else {
        toast.error(res?.payload?.message || "Could not update featured truck");
      }
    } finally {
      setFeaturingId(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showAddByRoute) setShowForm(true);
  }, [showAddByRoute]);

  useEffect(() => {
    return () => {
      form.photos.forEach((p) => {
        if (p?.url) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key) => (e) => {
    let value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (key === "registration" || key === "chassis_number") {
      value = normalizePlateInput(value);
      setIdErrors((err) => ({ ...err, [key]: "" }));
    }
    if (key === "price_hour" || key === "price_day") {
      value = sanitizeMoneyInput(value);
    }
    setForm((f) => ({ ...f, [key]: value }));
  };

  useEffect(() => {
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
  }, [dispatch, form.registration, form.chassis_number]);

  const openAdd = () => {
    setForm(emptyForm());
    setIdErrors({ registration: "", chassis_number: "" });
    setShowForm(true);
    if (!showAddByRoute) navigate("/logistics/owner/fleet/add", { replace: true });
  };

  const closeAdd = () => {
    form.photos.forEach((p) => {
      if (p?.url) URL.revokeObjectURL(p.url);
    });
    setShowForm(false);
    setForm(emptyForm());
    if (showAddByRoute) navigate("/logistics/owner/fleet", { replace: true });
  };

  const onAddPhotos = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setForm((f) => {
      const next = [...f.photos];
      for (const file of picked) {
        if (next.length >= 6) break;
        next.push({ file, url: URL.createObjectURL(file), name: file.name });
      }
      return { ...f, photos: next };
    });
  };

  const onRemovePhoto = (idx) => {
    setForm((f) => {
      const copy = [...f.photos];
      const [removed] = copy.splice(idx, 1);
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return { ...f, photos: copy };
    });
  };

  const onPickDoc = (id, file) => {
    setForm((f) => ({
      ...f,
      docs: {
        ...f.docs,
        [id]: {
          ...(f.docs[id] || {}),
          name: file.name,
          file,
        },
      },
    }));
  };

  const onDocExpiry = (id, expires) => {
    setForm((f) => ({
      ...f,
      docs: {
        ...f.docs,
        [id]: {
          ...(f.docs[id] || {}),
          expires,
        },
      },
    }));
  };

  const add = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      toast.error(plant ? "Equipment name is required" : "Vehicle name is required");
      return;
    }
    if (plant && !form.equipment) {
      toast.error("Pick an equipment type");
      return;
    }
    if (!plant && !String(form.registration || "").trim()) {
      toast.error("Registration plate is required");
      return;
    }
    if (plant && form.motor_vehicle && !String(form.registration || "").trim()) {
      toast.error("Registration plate is required for motor vehicles");
      return;
    }
    if (idErrors.registration || idErrors.chassis_number) {
      toast.error("Fix registration or chassis conflicts before saving");
      return;
    }
    if (plant) {
      if (form.price_hour !== "" && form.price_hour != null) {
        const h = parseLogisticsMoney(form.price_hour, { field: "Hourly rate" });
        if (!h.ok) {
          toast.error(h.message);
          return;
        }
      }
      if (form.price_day !== "" && form.price_day != null) {
        const d = parseLogisticsMoney(form.price_day, { field: "Day rate" });
        if (!d.ok) {
          toast.error(d.message);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const coords = form.location_coords;
      const fd = new FormData();
      const fields = {
        kind: plant ? "equipment" : cab ? "cab" : "vehicle",
        category: form.category,
        cab_class: cab ? form.cab_class : "",
        seats: cab ? form.seats : "",
        name: String(form.name).trim(),
        make: form.make || "",
        model: form.model || "",
        year: form.year || "",
        registration: form.registration || "",
        chassis_number: form.chassis_number || "",
        vin: form.vin || "",
        capacity_value: cab ? "" : form.capacity_value || "",
        capacity_unit: form.capacity_unit || "tons",
        carriage_length_ft: form.carriage_length_ft || "",
        carriage_width_ft: form.carriage_width_ft || "",
        carriage_height_ft: form.carriage_height_ft || "",
        vehicle_type: !plant && !cab ? form.vehicle_type || "" : "",
        equipment_type: plant ? form.equipment || "" : "",
        subtype: plant ? form.subtype || "" : "",
        mobility: plant ? form.mobility || "" : "",
        engine_type: plant ? form.engine_type || "" : "",
        operating_range_km: plant ? form.operating_range || "" : "",
        price_hour: plant ? form.price_hour || "" : "",
        price_day: plant ? form.price_day || "" : "",
        direct_booking_enabled: form.direct_booking_enabled ? "true" : "false",
        ...(coords
          ? { lng: String(coords[0]), lat: String(coords[1]) }
          : {}),
        ...(form.location
          ? {
              location_label: String(form.location).trim(),
              address: String(form.location).trim(),
            }
          : {}),
      };
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== "" && v != null) fd.append(k, v);
      });
      form.photos.forEach((p) => {
        if (p?.file) fd.append("photos", p.file);
      });

      const docTypes = [];
      const docExpires = [];
      const docNames = [];
      Object.entries(form.docs || {}).forEach(([type, entry]) => {
        if (!entry?.file) return;
        fd.append("documents", entry.file);
        docTypes.push(type);
        docExpires.push(entry.expires || "");
        docNames.push(entry.name || entry.file.name || type);
      });
      if (docTypes.length) {
        fd.append("document_types", JSON.stringify(docTypes));
        fd.append("document_expires", JSON.stringify(docExpires));
        fd.append("document_names", JSON.stringify(docNames));
      }

      const res = await dispatch(LogisticsActions.createAsset(fd));
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success(plant ? "Equipment added" : cab ? "Cab added" : "Vehicle added");
        closeAdd();
        await load();
      } else {
        if (isPlanLimitError(res?.payload)) {
          toast.error(`${res.payload.message} Tap to see plans.`, {
            onClick: () => navigate("/logistics/owner/subscription"),
          });
        } else {
          toast.error(res?.payload?.message || "Could not save");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const countLabel = useMemo(() => {
    if (loading) return null;
    if (!total) {
      return hasFilters
        ? "No equipment matches these filters"
        : "0 assets";
    }
    if (showPagination) {
      const from = (page - 1) * FLEET_PAGE_SIZE + 1;
      const to = Math.min(page * FLEET_PAGE_SIZE, total);
      return `Showing ${from}–${to} of ${total} asset${total === 1 ? "" : "s"}`;
    }
    return `${total} asset${total === 1 ? "" : "s"}`;
  }, [loading, total, hasFilters, showPagination, page]);

  const pageTitle = showForm ? "Add equipment" : "Fleet";

  return (
    <LogisticsPageShell
      title={pageTitle}
      crumbLabel={pageTitle}
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <LogisticsPlanBanner
        buckets={cabEnabled ? ["vehicles", "cabs", "equipment"] : ["vehicles", "equipment"]}
        refreshKey={assets.length}
      />
      {!showForm ? (
        <>
          <div className="log-fleet-head">
            <div>
              {/* <p className="log-hub-section__lead" style={{ margin: 0 }}>
                Trucks and plant share one list. Assign operators after saving.
              </p> */}
            </div>
            <button
              type="button"
              className="logistics-cta logistics-cta--primary"
              onClick={openAdd}
            >
              Add equipment
            </button>
          </div>

          {assets.length || hasFilters ? (
            <form className="log-jobs-toolbar log-jobs-toolbar--wrap" onSubmit={applyFilters}>
              <label className="log-jobs-toolbar__search">
                <span className="log-fl">Search</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, plate, chassis, VIN, make, model, year…"
                  aria-label="Search fleet"
                />
              </label>
              <label>
                <span className="log-fl">Type</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  aria-label="Truck or equipment"
                >
                  <option value="all">All</option>
                  <option value="vehicle">Truck</option>
                  <option value="equipment">Equipment</option>
                  {cabEnabled || kind === "cab" ? <option value="cab">Cab</option> : null}
                </select>
              </label>
              <div className="log-jobs-toolbar__actions">
                <button
                  type="submit"
                  className="logistics-cta logistics-cta--primary"
                >
                  Apply
                </button>
                {hasFilters || q || kind !== "vehicle" ? (
                  <button
                    type="button"
                    className="logistics-cta logistics-cta--ghost"
                    onClick={clearFilters}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </form>
          ) : null}

          {!loading && countLabel ? (
            <p className="log-jobs-meta">{countLabel}</p>
          ) : null}
        </>
      ) : null}

      {showForm ? (
        <form className="log-form-card log-fleet-form" onSubmit={add} noValidate>
          <div className="log-fleet-form__title-row">
            <h2 className="log-sect" style={{ margin: 0 }}>
              Add equipment
            </h2>
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={closeAdd}
            >
              Cancel
            </button>
          </div>

          <LogisticsCategoryTiles
            value={form.category}
            hint="One Equipment Provider account — fields below change with the category you pick."
            onChange={(category) =>
              setForm((f) => ({
                ...f,
                category,
                equipment: "Tractor",
                subtype: "Compact",
                ...(isPlantCategory(category)
                  ? {}
                  : {
                      needs_operator: "yes",
                      operators_needed:
                        Number(f.operators_needed) >= 1
                          ? f.operators_needed
                          : "1",
                    }),
              }))
            }
          />

          {!plant ? (
            <div className="log-form-grid">
              <PhotoSlots
                files={form.photos}
                onAdd={onAddPhotos}
                onRemove={onRemovePhoto}
              />

              <label className="log-field">
                <span className="log-fl">
                  Name <span className="log-req">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={set("name")}
                  placeholder={cab ? "Cab 1" : "Truck 1"}
                  required
                />
              </label>
              {cab ? (
              <>
              <label className="log-field">
                <span className="log-fl">
                  Cab type <span className="log-req">*</span>
                </span>
                <select
                  value={form.cab_class}
                  onChange={(e) => {
                    const next =
                      DEFAULT_CAB_CLASSES.find((c) => c.id === e.target.value) ||
                      DEFAULT_CAB_CLASSES[2];
                    setForm((f) => ({
                      ...f,
                      cab_class: next.id,
                      seats: String(Math.min(Number(f.seats) || next.max_seats, next.max_seats)),
                    }));
                  }}
                >
                  {DEFAULT_CAB_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} ({c.wheels}-wheeler)
                    </option>
                  ))}
                </select>
              </label>
              <label className="log-field">
                <span className="log-fl">Passenger seats</span>
                <select value={form.seats} onChange={set("seats")}>
                  {Array.from({ length: cabMeta.max_seats }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              </>
              ) : (
              <>
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

              <div className="log-field">
                <span className="log-fl">Capacity</span>
                <div className="log-weight-row">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.capacity_value}
                    onChange={set("capacity_value")}
                    placeholder="15"
                  />
                  <select
                    value={form.capacity_unit}
                    onChange={set("capacity_unit")}
                    aria-label="Capacity unit"
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
                {capacityTons != null && capacityTons > 0 ? (
                  <span className="log-weight-hint">
                    Matches customer{" "}
                    <strong>Vehicle needed: {capacityToTier(capacityTons)}</strong>
                  </span>
                ) : null}
              </div>
              </>
              )}
              <label className="log-field">
                <span className="log-fl">Make</span>
                <input
                  value={form.make}
                  onChange={set("make")}
                  placeholder="Isuzu"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Model</span>
                <input
                  value={form.model}
                  onChange={set("model")}
                  placeholder="FVZ"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Year</span>
                <input
                  type="number"
                  min="1980"
                  max="2100"
                  value={form.year}
                  onChange={set("year")}
                  placeholder="2019"
                />
              </label>

              <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                Identity &amp; verification
              </p>
              <p className="log-hint log-field--full">
                Registration plate and chassis must be unique on Simba. Plate
                uses capital letters and numbers only.
              </p>
              <label
                className={`log-field${idErrors.registration ? " log-field--error" : ""}`}
              >
                <span className="log-fl">
                  Registration plate <span className="log-req">*</span>
                </span>
                <input
                  value={form.registration}
                  onChange={set("registration")}
                  placeholder="AEB1234"
                  autoCapitalize="characters"
                  required
                  aria-invalid={!!idErrors.registration}
                />
                {idErrors.registration ? (
                  <span className="log-field-error">{idErrors.registration}</span>
                ) : null}
              </label>
              <label
                className={`log-field${idErrors.chassis_number ? " log-field--error" : ""}`}
              >
                <span className="log-fl">Chassis number</span>
                <input
                  value={form.chassis_number}
                  onChange={set("chassis_number")}
                  placeholder="JALFSR34H7K012345"
                  autoCapitalize="characters"
                  aria-invalid={!!idErrors.chassis_number}
                />
                {idErrors.chassis_number ? (
                  <span className="log-field-error">{idErrors.chassis_number}</span>
                ) : null}
              </label>
              <label className="log-field log-field--full">
                <span className="log-fl">VIN</span>
                <input
                  value={form.vin}
                  onChange={set("vin")}
                  placeholder="JALFSR34H7K012345"
                />
              </label>

              {cab ? (
              <p className="log-hint log-field--full">
                Assign drivers after saving — or leave it unassigned and drive
                this cab yourself (quote as owner).
              </p>
              ) : (
              <>
              <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                Carriage area
              </p>
              <label className="log-field">
                <span className="log-fl">Length (ft)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.carriage_length_ft}
                  onChange={set("carriage_length_ft")}
                  placeholder="20"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Width (ft)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.carriage_width_ft}
                  onChange={set("carriage_width_ft")}
                  placeholder="8"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Height (ft)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.carriage_height_ft}
                  onChange={set("carriage_height_ft")}
                  placeholder="9"
                />
              </label>

              <label className="log-field">
                <span className="log-fl">Needs operator? · Locked</span>
                <select value="yes" disabled>
                  <option value="yes">Yes</option>
                </select>
              </label>
              <label className="log-field">
                <span className="log-fl">Operators needed</span>
                <select
                  value={form.operators_needed}
                  onChange={set("operators_needed")}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <p className="log-hint log-field--full">
                Logistic vehicles always need at least one operator (driver).
                Assign one or more operators after saving — same as plant.
              </p>
              </>
              )}

              <div className="log-field--full">
                <LogisticsLocationField
                  label="Base location"
                  address={form.location}
                  coords={form.location_coords}
                  title="Vehicle base location"
                  hint="Search or pin where this vehicle is based."
                  onChange={({ address, coords }) =>
                    setForm((f) => ({
                      ...f,
                      location: address || "",
                      location_coords: coords,
                    }))
                  }
                />
              </div>

              <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                Vehicle documents{" "}
                <span className="log-sect__soft">(required for verification)</span>
              </p>
              <p className="log-hint log-field--full">
                {cab
                  ? "Ownership, insurance, rego and taxi permit — proves you own the cab and can carry passengers."
                  : "Ownership, insurance, rego and roadworthy — proves you own the truck and it can legally operate."}
              </p>
              <div className="log-field--full">
                <DocRows
                  items={cab ? CAB_DOCS : LOGISTIC_DOCS}
                  docs={form.docs}
                  onPick={onPickDoc}
                  onExpiry={onDocExpiry}
                />
              </div>
            </div>
          ) : (
            <div className="log-form-grid log-form-grid--plant">
              <div className="log-pick-row log-field--full">
                <LogisticsPickField
                  label="Equipment type"
                  value={form.equipment}
                  placeholder="Pick type"
                  required
                  onClick={() => setEquipOpen(true)}
                />
                <LogisticsPickField
                  label="Sub type"
                  value={form.subtype}
                  placeholder="Pick sub type"
                  required
                  onClick={() => setSubtypeOpen(true)}
                />
              </div>
              <p className="log-hint log-field--full">
                Sub type depends on Equipment type — e.g. Tractor → Sub-Compact ·
                Compact · Heavy-Duty.
              </p>

              <label className="log-field">
                <span className="log-fl">
                  Name <span className="log-req">*</span>
                </span>
                <input
                  value={form.name}
                  onChange={set("name")}
                  placeholder="JD Compact 1"
                  required
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Brand</span>
                <input
                  value={form.make}
                  onChange={set("make")}
                  placeholder="John Deere"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Model / variant</span>
                <input
                  value={form.model}
                  onChange={set("model")}
                  placeholder="5075E"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Size / class</span>
                <input
                  value={form.size_class}
                  onChange={set("size_class")}
                  placeholder="40 hp · Compact band"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Engine type</span>
                <select
                  value={form.engine_type}
                  onChange={set("engine_type")}
                >
                  <option>Diesel</option>
                  <option>Petrol</option>
                  <option>Electric</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="log-field">
                <span className="log-fl">Weight</span>
                <input
                  value={form.weight_kg}
                  onChange={set("weight_kg")}
                  placeholder="2,850 kg"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Mobility</span>
                <select value={form.mobility} onChange={set("mobility")}>
                  <option>Wheeled</option>
                  <option>Tracked</option>
                  <option>Neither (not self-mobile)</option>
                </select>
              </label>

              <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                Identity &amp; verification
              </p>
              <p className="log-hint log-field--full">
                Chassis and registration must be unique on Simba. Letters and
                numbers only (capitals).
              </p>
              <label className="log-field">
                <span className="log-fl">VIN</span>
                <input
                  value={form.vin}
                  onChange={set("vin")}
                  placeholder="1JD5075EKF1234567"
                />
              </label>
              <label
                className={`log-field${idErrors.chassis_number ? " log-field--error" : ""}`}
              >
                <span className="log-fl">Chassis number</span>
                <input
                  value={form.chassis_number}
                  onChange={set("chassis_number")}
                  placeholder="JD5075ECH88421"
                  autoCapitalize="characters"
                  aria-invalid={!!idErrors.chassis_number}
                />
                {idErrors.chassis_number ? (
                  <span className="log-field-error">{idErrors.chassis_number}</span>
                ) : null}
              </label>

              <label className="log-check log-field--full">
                <input
                  type="checkbox"
                  checked={form.motor_vehicle}
                  onChange={set("motor_vehicle")}
                />
                <span>
                  <b>Motor vehicle (self-propelled)</b>
                  <small>
                    Tick if this machine needs a road registration plate.
                  </small>
                </span>
              </label>
              {form.motor_vehicle ? (
                <label
                  className={`log-field log-field--full${idErrors.registration ? " log-field--error" : ""}`}
                >
                  <span className="log-fl">
                    Registration plate <span className="log-req">*</span>
                  </span>
                  <input
                    value={form.registration}
                    onChange={set("registration")}
                    placeholder="AEBPLANT09"
                    autoCapitalize="characters"
                    required
                    aria-invalid={!!idErrors.registration}
                  />
                  {idErrors.registration ? (
                    <span className="log-field-error">
                      {idErrors.registration}
                    </span>
                  ) : null}
                </label>
              ) : null}

              <label className="log-field">
                <span className="log-fl">Needs operator?</span>
                <select
                  value={form.needs_operator}
                  onChange={set("needs_operator")}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="log-field">
                <span className="log-fl">Operators needed</span>
                <select
                  value={form.operators_needed}
                  onChange={set("operators_needed")}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <div className="log-field--full">
                <LogisticsLocationField
                  label="Base / operating area"
                  address={form.location}
                  coords={form.location_coords}
                  title="Equipment base location"
                  onChange={({ address, coords }) =>
                    setForm((f) => ({
                      ...f,
                      location: address || "",
                      location_coords: coords,
                    }))
                  }
                />
              </div>
              <label className="log-field log-field--full">
                <span className="log-fl">Operating range (km)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.operating_range}
                  onChange={set("operating_range")}
                  placeholder="e.g. 80 — hire jobs outside this distance won’t alert you"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Price / hour</span>
                <LogisticsMoneyInput
                  value={form.price_hour}
                  onChange={(v) => setForm((f) => ({ ...f, price_hour: v }))}
                  aria-label="Price per hour"
                />
              </label>
              <label className="log-field">
                <span className="log-fl">Price / day</span>
                <LogisticsMoneyInput
                  value={form.price_day}
                  onChange={(v) => setForm((f) => ({ ...f, price_day: v }))}
                  aria-label="Price per day"
                />
              </label>

              <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                Equipment documents{" "}
                <span className="log-sect__soft">(required for verification)</span>
              </p>
              <p className="log-hint log-field--full">
                Ownership, insurance and road papers — stops bogus non-owner
                listings.
              </p>
              <div className="log-field--full">
                <DocRows
                  items={
                    form.motor_vehicle
                      ? [
                          ...PLANT_DOCS.slice(0, 3),
                          {
                            id: "rego",
                            label: "Rego / road licensing",
                            hint: "Required when motor vehicle is ticked",
                          },
                          PLANT_DOCS[3],
                        ]
                      : PLANT_DOCS
                  }
                  docs={form.docs}
                  onPick={onPickDoc}
                  onExpiry={onDocExpiry}
                />
              </div>

              <PhotoSlots
                files={form.photos}
                onAdd={onAddPhotos}
                onRemove={onRemovePhoto}
              />
            </div>
          )}

          <div className="log-callout log-field--full" style={{ marginTop: 16 }}>
            <p>
              <strong>Equipment Provider</strong> — Logistic trucks and plant
              share one list. Operators are assigned per asset.
            </p>
          </div>

          <label className="log-check" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              checked={form.direct_booking_enabled}
              onChange={set("direct_booking_enabled")}
            />
            Allow direct booking from Hub / Search
          </label>

          <div className="log-form-actions">
            <button
              type="submit"
              className="logistics-cta logistics-cta--primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save equipment"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className="logistics-empty">Loading fleet…</p>
      ) : assets.length ? (
        <>
          {hubFeature && assets.some((x) => x.kind === "vehicle") ? (
            <p className={`log-feature-note${hubFeature.eligible ? "" : " is-locked"}`}>
              <span aria-hidden="true">★</span>
              {hubFeature.eligible ? (
                <>
                  One of your logistic trucks is shown in the Hub&rsquo;s{" "}
                  <b>Top logistics providers</b>. Tap <b>Feature</b> to choose it —
                  otherwise we pick your best-rated truck (then most jobs, then first added).
                </>
              ) : (
                <>
                  Upgrade to <Link to="/logistics/owner/subscription">Paid</Link> to show
                  a truck in the Hub&rsquo;s <b>Top logistics providers</b> and pick which one.
                </>
              )}
            </p>
          ) : null}
          <div className="log-jobs-table-wrap">
            <table className="log-jobs-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Registration</th>
                  <th>Operators</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageAssets.map((a) => {
                  const state = a.availability?.state || "offline";
                  const listed = Number(a.is_active) === 1;
                  const cap = formatCapacity(a.capacity);
                  const cat =
                    a.services?.[0] ||
                    (a.kind === "equipment" ? "Equipment" : a.kind === "cab" ? "Cab" : "Logistic");
                  const type =
                    a.capabilities?.find((c) => !String(c).includes(":")) ||
                    (a.kind === "equipment" ? "Equipment" : a.kind === "cab" ? "Cab" : "Vehicle");
                  return (
                    <tr key={a._id}>
                      <td>
                        <b>{a.name}</b>
                        {hubFeature?.featured_asset_id === a._id ? (
                          <span
                            className="log-feature-tag"
                            title={
                              hubFeature.pinned_asset_id === a._id
                                ? "You picked this truck for the Hub"
                                : "Auto-picked: best rating, then most jobs, then first added"
                            }
                          >
                            ★ In Hub
                            {hubFeature.pinned_asset_id === a._id ? "" : " · auto"}
                          </span>
                        ) : null}
                        {cap ? (
                          <div className="log-hint">{cap}</div>
                        ) : null}
                      </td>
                      <td>
                        {String(cat).charAt(0).toUpperCase() +
                          String(cat).slice(1)}{" "}
                        · {type}
                      </td>
                      <td>{a.registration || "—"}</td>
                      <td>
                        {a.assigned_sub_user_ids?.length
                          ? a.assigned_sub_user_ids.length
                          : "None"}
                      </td>
                      <td>
                        {!listed ? (
                          <span
                            className={`log-chip log-chip--closed${a.plan_locked ? " log-chip--plan" : ""}`}
                            title={a.plan_locked ? "Above your plan limit — choose active units in Plans" : undefined}
                          >
                            {a.plan_locked ? "Plan limit" : "Disabled"}
                          </span>
                        ) : (
                          <span
                            className={`log-chip log-chip--${AVAIL_TONE[state] || "muted"}`}
                          >
                            {AVAIL_LABEL[state] || state}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="log-fleet-row-actions">
                          {a.kind === "vehicle" && listed ? (
                            <FeatureButton
                              asset={a}
                              hubFeature={hubFeature}
                              busy={featuringId === a._id}
                              onToggle={toggleFeature}
                            />
                          ) : null}
                          <Link
                            className="log-jobs-table__open"
                            to={`/logistics/owner/fleet/${a._id}`}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pageAssets.length ? (
                  <tr>
                    <td colSpan={6} className="logistics-empty">
                      No equipment matches these filters
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {showPagination ? (
            <div className="log-jobs-pager" role="navigation" aria-label="Pages">
              <button
                type="button"
                className="logistics-cta logistics-cta--ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="log-jobs-pager__pages">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="logistics-cta logistics-cta--ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : !showForm ? (
        <div className="log-fleet-empty">
          <span className="log-fleet-empty__icon" aria-hidden="true">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M3 7h13l5 5v5H3V7Z" />
              <path d="M16 7v5h5" />
              <circle cx="7.5" cy="17.5" r="1.5" />
              <circle cx="17.5" cy="17.5" r="1.5" />
            </svg>
          </span>
          <b>No equipment yet</b>
          <p>Add trucks or plant so customers can search and hire from you.</p>
          <button
            type="button"
            className="logistics-cta logistics-cta--primary"
            onClick={openAdd}
          >
            Add your first equipment
          </button>
        </div>
      ) : null}

      <EquipmentPickerModal
        open={equipOpen}
        category={form.category}
        onClose={() => setEquipOpen(false)}
        onSelect={(equipment) =>
          setForm((f) => ({
            ...f,
            equipment,
            subtype: "",
          }))
        }
      />
      <SubtypePickerModal
        open={subtypeOpen}
        category={form.category}
        equipment={form.equipment}
        onClose={() => setSubtypeOpen(false)}
        onSelect={(subtype) => setForm((f) => ({ ...f, subtype }))}
      />
    </LogisticsPageShell>
  );
}

/** Fleet row: pin / unpin a logistic truck as the owner's Hub featured truck (Paid only). */
function FeatureButton({ asset, hubFeature, busy, onToggle }) {
  const eligible = !!hubFeature?.eligible;
  const pinned = eligible && hubFeature?.pinned_asset_id === asset._id;
  const label = !eligible ? "Feature" : pinned ? "Unfeature" : "Feature";
  const title = !eligible
    ? "Paid plan: show this truck in the Hub's Top logistics providers"
    : pinned
      ? "Stop pinning — the Hub will auto-pick your top-rated truck"
      : "Show this truck in the Hub's Top logistics providers";
  return (
    <button
      type="button"
      className={`log-feature-btn${pinned ? " is-on" : ""}${eligible ? "" : " is-locked"}`}
      onClick={() => onToggle(asset, !pinned)}
      disabled={busy}
      title={title}
      aria-pressed={pinned}
    >
      <span aria-hidden="true">{pinned ? "★" : eligible ? "☆" : "🔒"}</span>
      {busy ? "…" : label}
    </button>
  );
}
