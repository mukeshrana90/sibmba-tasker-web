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
  formatCarriageSize,
  isTruckBodyType,
} from "../../utils/logisticVehicleWeight";
import "./logistics.css";
import {
  LogisticsDetailSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";
import {
  ASSET_COMPLIANCE_TYPES,
  REMINDER_HINT,
  docExpiryChip,
  docReviewChip,
  docRuleHint,
  fmtExpiry,
  tomorrowYmd,
} from "../../utils/docExpiry";
import { DEFAULT_COUNTRY_CODE } from "../../utils/logisticsPhone";
import { focusField } from "../../utils/focusField";
import { MIN_ASSET_PHOTOS, ownerUnitHeadline, photosMissingNote, unitStatusChip } from "../../utils/ownerUnitStatus";
import { apiErrorMessage, isApiFailure } from "../../utils/ownerOperator";
import LogisticsDocReplace, { DocWarning } from "../../CommanComponents/LogisticsDocReplace";
import { UnitOperateControl, useOwnerOnUnit } from "../../CommanComponents/LogisticsOwnerOperator";
import useDocDeepLink from "../../Hooks/useDocDeepLink";
import { formatRate, rateUnitOf } from "../../utils/assetRate";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import { DOC_ACCEPT, PHOTO_ACCEPT, keepAllowedFiles } from "../../utils/uploadLimits";
import { useLogisticsConfig } from "../../CommanComponents/useLogisticsConfig";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";

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

const DOC_LABELS = {
  ownership: "Ownership papers",
  insurance: "Insurance",
  rego: "Road licence (ZINARA)",
  roadworthy: "Roadworthy / fitness",
  taxi_permit: "Taxi / PSV permit",
  pollution: "Road / pollution",
  vin_photo: "VIN / chassis plate photo",
  other: "Document",
};

// Required documents first
const VEHICLE_DOC_DEFS = [
  { id: "rego", label: "Road licence (ZINARA)", hint: "Road papers" },
  { id: "roadworthy", label: "Roadworthy / fitness", hint: "Tap to upload" },
  { id: "ownership", label: "Ownership papers", hint: "Proof you own this truck" },
  { id: "insurance", label: "Insurance", hint: "Current cover" },
];

const CAB_DOC_DEFS = [
  { id: "ownership", label: "Ownership papers", hint: "Proof you own this cab" },
  { id: "insurance", label: "Insurance", hint: "Passenger cover" },
  { id: "rego", label: "Road licence (ZINARA)", hint: "Road papers" },
  { id: "taxi_permit", label: "Taxi / PSV permit", hint: "Permit to carry passengers" },
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
  return hit ? normalizePlateInput(String(hit).slice(4)) : "";
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
  red_plate: false,
});

/** v2.7.66: the unit's base and range, which decide the jobs it can see. */
function operatingAreaFields(next) {
  return {
    operating_range_km: next?.operating_range_km ?? "",
    base_label: next?.base_label || next?.location_label || "",
    base_coords: Array.isArray(next?.home_location?.coordinates) ? next.home_location.coordinates : null,
  };
}

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
    ...operatingAreaFields(next),
    name: next.name || "",
    make: next.make || "",
    model: next.model || "",
    year: next.year != null ? String(next.year) : "",
    registration: normalizePlateInput(next.registration || ""),
    red_plate: Boolean(next.red_plate),
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
    price: next.price_hint?.amount != null ? String(next.price_hint.amount) : "",
    rate_unit: rateUnitOf(next.price_hint),
  };
}

export default function LogisticsOwnerAsset() {
  // Loads the server upload limit (config.upload) for the file pickers
  const { config: logisticsConfig } = useLogisticsConfig();
  const { id } = useParams();
  const dispatch = useDispatch();
  const [asset, setAsset] = useState(null);
  const [operators, setOperators] = useState([]);
  const [drivers, setDrivers] = useState([]);
  // Unexpired pending invites: on this unit (assigned on acceptance) + all of the owner's
  const [assetInvites, setAssetInvites] = useState([]);
  const [ownerInvites, setOwnerInvites] = useState([]);
  const [customerView, setCustomerView] = useState(null);
  const [docCompliance, setDocCompliance] = useState(null);
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
    const rawAsset = assetRes?.payload?.data?.asset || null;
    // The server sends who holds the unit (and its running job) next to the asset; keep it on the asset like the fleet list does
    const occupancy = assetRes?.payload?.data?.occupancy;
    const next = rawAsset && occupancy && !rawAsset.occupancy ? { ...rawAsset, occupancy } : rawAsset;
    const ops =
      assetRes?.payload?.data?.operators ||
      next?.assigned_sub_user_ids ||
      [];
    setAsset(next);
    setOperators(Array.isArray(ops) ? ops.filter((o) => o && typeof o === "object") : []);
    setDrivers(subRes?.payload?.data?.drivers || []);
    setAssetInvites(assetRes?.payload?.data?.pending_invites || []);
    setOwnerInvites(
      (subRes?.payload?.data?.invites || []).filter(
        (inv) => inv.invite_state !== "expired"
      )
    );
    setCustomerView(assetRes?.payload?.data?.customer_view || null);
    setDocCompliance(assetRes?.payload?.data?.document_compliance || null);
    if (next) {
      setForm(formFromAsset(next));
      resetPhotoEditors(next);
      resetDocEditors(next);
    }
    setLoading(false);
  };

  useDocDeepLink();

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
    if (key === "vin") value = normalizePlateInput(value);
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
          ? "This registration plate is already on Simba Tasker"
          : "",
        chassis_number: data.chassis_taken
          ? "This chassis number is already on Simba Tasker"
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
    const picked = keepAllowedFiles(e.target.files, { imagesOnly: true });
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

  const availableInvites = useMemo(() => {
    const linked = new Set(assetInvites.map((i) => String(i.invite_id)));
    return ownerInvites.filter((inv) => !linked.has(String(inv._id)));
  }, [ownerInvites, assetInvites]);

  const save = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      toast.error("Name is required");
      focusField("name");
      return;
    }
    // doc 12 · 4.3: an edit can't take a unit below 2 photos (older units under 2 can't lose more)
    const photoCount = keptPhotos.length + newPhotos.length;
    const minPhotos = Math.min(MIN_ASSET_PHOTOS, (asset?.photos || []).length);
    if (photoCount < minPhotos) {
      toast.error(`Keep at least ${MIN_ASSET_PHOTOS} real photos of the unit`);
      focusField("photos");
      return;
    }
    if ((asset?.kind === "vehicle" || asset?.kind === "cab") && !String(form.registration || "").trim()) {
      toast.error("Registration plate is required");
      focusField("registration");
      return;
    }
    if (idErrors.registration || idErrors.chassis_number) {
      toast.error("Fix registration or chassis conflicts before saving");
      focusField("registration");
      return;
    }
    const missingExpiry = Object.entries(docDrafts || {}).find(
      ([type, entry]) =>
        ASSET_COMPLIANCE_TYPES.includes(type) && (entry?.file || entry?.url) && !entry?.expires
    );
    if (missingExpiry) {
      toast.error(`${DOC_LABELS[missingExpiry[0]] || missingExpiry[0]}: expiry date is required`);
      focusField(`doc-${missingExpiry[0]}`);
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
        operating_range_km: form.operating_range_km ?? "",
        ...(Array.isArray(form.base_coords)
          ? { base_lng: String(form.base_coords[0]), base_lat: String(form.base_coords[1]), base_label: form.base_label || "" }
          : {}),
        ...(asset?.kind === "cab" ? { red_plate: form.red_plate ? "true" : "false" } : {}),
        ...(asset?.kind === "equipment"
          ? { price: form.price || "", rate_unit: form.price ? form.rate_unit || "day" : "" }
          : {}),
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
      // Pending invites are "invite:<id>" options — linked now, assigned on acceptance
      const inviteId = pickOperator.startsWith("invite:")
        ? pickOperator.slice("invite:".length)
        : null;
      const res = await dispatch(
        LogisticsActions.assignOperator(
          inviteId ? { id, invite_id: inviteId } : { id, sub_user_id: pickOperator }
        )
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success(
          inviteId
            ? "Linked — the operator is assigned as soon as they accept the invite"
            : "Operator assigned"
        );
        setPickOperator("");
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not assign");
      }
    } finally {
      setSaving(false);
    }
  };

  // Item 18: uploads this one file; the other documents stay as they are
  const replaceDoc = async (type, file, expires) => {
    const fd = new FormData();
    fd.append("documents", file);
    fd.append("document_types", JSON.stringify([type]));
    fd.append("document_expires", JSON.stringify([expires || ""]));
    fd.append("document_names", JSON.stringify([file.name]));
    const res = await dispatch(LogisticsActions.patchAsset({ id, payload: fd }));
    if (isApiFailure(res)) {
      toast.error(apiErrorMessage(res?.payload, "Could not replace the document"));
      return false;
    }
    toast.success("Document replaced — Simba Tasker will check it");
    await load();
    return true;
  };

  const removeInvite = async (inviteId) => {
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.unassignOperator({ id, invite_id: inviteId })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Pending operator removed from this unit");
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not remove");
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
        toast.error(apiErrorMessage(res?.payload, "Could not remove"), { autoClose: 8000 });
      }
    } finally {
      setSaving(false);
    }
  };

  const photos = (asset?.photos || [])
    .map(assetPhotoUrl)
    .filter(Boolean);
  const documents = Array.isArray(asset?.documents) ? asset.documents : [];
  const rejectedPhotos = (asset?.photo_reviews || []).filter((r) => r?.status === "rejected");
  const active = Number(asset?.is_active) === 1;
  const vin = assetVin(asset);
  const isTruck = asset?.kind !== "equipment";
  // While the owner uses this unit himself, operator management stays hidden until he taps Stop using
  const ownerOnUnit = useOwnerOnUnit(asset) && active;
  const docDefs = useMemo(() => {
    const base =
      asset?.kind === "equipment"
        ? EQUIPMENT_DOC_DEFS
        : asset?.kind === "cab"
          ? CAB_DOC_DEFS
          : VEHICLE_DOC_DEFS;
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
  // 17 Nov (client): body type capitalised; the default "regular" isn't shown in the header
  const bodyType = isTruck ? assetBodyType(asset) : "";
  const isRegularBody = String(bodyType).toLowerCase() === "regular";
  const typeLabel = (() => {
    if (!isTruck) return firstCapabilityLabel(asset) || kindLabel;
    if (bodyType) return bodyType.charAt(0).toUpperCase() + bodyType.slice(1);
    const raw = firstCapabilityLabel(asset);
    if (raw && !LEGACY_TYPE_LABELS.has(String(raw).toLowerCase())) return raw;
    return "";
  })();
  // 17 Nov (client): the real capacity ("15 tons"), never the Vehicle needed tier ("20 ton")
  const capacityLabel =
    isTruck && asset?.capacity?.value != null
      ? formatTons(toTons(asset.capacity.value, asset.capacity.unit || "tons"))
      : "";
  // doc 12 · L36: what customers see — never "Available now" on a unit they can't book
  const avail = asset ? unitStatusChip({ ...asset, customer_view: customerView }).label : "—";
  // 17 Nov (client): one status in the header (Listed / Hidden — reason / Plan limit / Disabled)
  const headline = ownerUnitHeadline(asset, docCompliance, customerView);

  return (
    <LogisticsPageShell
      title={asset?.name || "Equipment"}
      crumbLabel={asset?.name || "Equipment"}
      midCrumb={{ to: "/logistics/owner/fleet", label: "Fleet" }}
      homeTo="/logistics/owner"
    >
      {loading ? (
        <LogisticsDetailSkeleton label="Loading equipment" />
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
                  <span className={`log-chip log-chip--${headline.tone}`}>
                    {headline.label}
                  </span>
                </div>
                <p className="log-lead" style={{ margin: 0 }}>
                  {kindLabel} · {category}
                  {typeLabel && !isRegularBody ? ` · ${typeLabel}` : ""}
                  {capacityLabel ? ` · ${capacityLabel}` : ""}
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

            {docCompliance?.block?.code === "DOC_REQUIRED" ? (
              <div className="log-callout log-callout--danger log-doc-required" style={{ marginBottom: 16 }}>
                <p>
                  <strong>
                    Hidden from customers —{" "}
                    {docCompliance.block.type === "rego"
                      ? "road licence (ZINARA) required"
                      : docCompliance.block.type === "other"
                        ? "a document is required"
                        : `${String(docCompliance.block.label || "document").toLowerCase()} required`}
                    .
                  </strong>{" "}
                  {docCompliance.block.message} Add it under Edit details → Documents.
                </p>
              </div>
            ) : docCompliance?.block?.code === "DOC_REJECTED" ? (
              <div className="log-callout log-callout--danger log-doc-rejected" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Hidden from customers — {String(docCompliance.block.label || "document").toLowerCase()} rejected.</strong>{" "}
                  {docCompliance.block.message} Use Replace document below.
                </p>
              </div>
            ) : docCompliance?.block?.code === "DOC_PENDING_CHECK" ? (
              <div className="log-callout log-callout--warn log-doc-pending" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Awaiting Simba Tasker&apos;s document check — the unit is shown to customers once verified.</strong>{" "}
                  {docCompliance.block.message}
                </p>
              </div>
            ) : docCompliance?.expired?.some((d) => d.blocking !== false) ? (
              <div className="log-callout log-callout--danger" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Hidden from customers — documents expired.</strong>{" "}
                  {docCompliance.expired
                    .filter((d) => d.blocking !== false)
                    .map((d) => `${d.label} expired on ${fmtExpiry(d.expires)}`)
                    .join("; ")}
                  . Nobody can book or quote with this unit until you upload the
                  renewed document (Replace document, below).
                </p>
              </div>
            ) : docCompliance?.expiring?.length ? (
              <div className="log-callout log-callout--warn" style={{ marginBottom: 16 }}>
                <p>
                  <strong>Renew soon:</strong>{" "}
                  {docCompliance.expiring
                    .map((d) =>
                      d.status === "today"
                        ? `${d.label} expires today`
                        : `${d.label} expires in ${d.days_left} day${d.days_left === 1 ? "" : "s"}`
                    )
                    .join("; ")}
                  . The unit is hidden from customers from the day after expiry.
                </p>
              </div>
            ) : null}

            {asset && photosMissingNote(asset) ? (
              <div className="log-callout log-callout--warn" style={{ marginBottom: 16 }}>
                <p>
                  <strong>{photosMissingNote(asset)}.</strong> Customers trust units with
                  real photos — use Edit to add them.
                </p>
              </div>
            ) : null}

            {active &&
            customerView &&
            !customerView.bookable &&
            customerView.status_detail !== "Documents expired" &&
            !/ required$| rejected$|^Awaiting document check$/.test(String(customerView.status_detail || "")) ? (
              <div className="log-callout log-callout--warn" style={{ marginBottom: 16 }}>
                <p>
                  {!operators.length && !asset?.owner_operating ? (
                    <>
                      <strong>Not bookable — no operator assigned.</strong> Customers can't
                      find or book this unit until an operator is assigned and accepts
                      their invite, or you use it yourself. Assign one under Operators below.
                    </>
                  ) : customerView.status_detail === "Operator not online on this unit" ? (
                    <>
                      <strong>Not bookable — nobody is live on this unit.</strong>{" "}
                      Customers can book it only while its operator, or you, are live on
                      it. Operators go live from their dashboard; you can use the unit
                      yourself while no operator is on it.
                    </>
                  ) : (
                    <>
                      <strong>Not bookable right now</strong> — {customerView.state_label || "offline"}.
                    </>
                  )}
                </p>
              </div>
            ) : null}

            {editing ? (
              <form className="log-form-grid" onSubmit={save} noValidate>
                <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                  Edit details
                </p>
                <label className="log-field" data-field="name">
                  <span className="log-fl">
                    Name <span className="log-req">*</span>
                  </span>
                  <input value={form.name} onChange={set("name")} required />
                </label>
                {asset?.kind === "cab" ? null : (
                  <>
                    <div className="log-field log-field--full">
                      <LogisticsLocationField
                        label="Base location"
                        address={form.base_label}
                        coords={form.base_coords}
                        title="Where this unit is based"
                        onChange={({ address, coords }) => setForm((f) => ({ ...f, base_label: address || "", base_coords: coords }))}
                      />
                    </div>
                    <label className="log-field" data-field="operating_range">
                      <span className="log-fl">Operating range (km)</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.operating_range_km}
                        onChange={set("operating_range_km")}
                        placeholder={`Default ${logisticsConfig?.default_operating_range_km ?? 100} km`}
                        data-testid="operating-range"
                      />
                    </label>
                  </>
                )}
                <label
                  data-field="registration"
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
                    placeholder="e.g. AEB 1234"
                    autoCapitalize="characters"
                    aria-invalid={!!idErrors.registration}
                  />
                  {idErrors.registration ? (
                    <span className="log-field-error">
                      {idErrors.registration}
                    </span>
                  ) : null}
                </label>
                {asset?.kind === "cab" ? (
                  <label className="log-check log-field--full" data-field="red_plate">
                    <input
                      type="checkbox"
                      checked={Boolean(form.red_plate)}
                      onChange={(e) => setForm((f) => ({ ...f, red_plate: e.target.checked }))}
                    />
                    <span>
                      <b>Red-plate (commercial) vehicle</b>
                      <small>We remind you before a roadworthy / fitness certificate expires.</small>
                    </span>
                  </label>
                ) : null}
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
                      Matches loads up to <strong>{formatTons(capacityTons)}</strong>
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

                <div className="log-field log-field--full" data-field="photos">
                  <span className="log-fl">
                    Photos <span className="log-req">*</span>
                  </span>
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
                          accept={PHOTO_ACCEPT}
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
                    At least {MIN_ASSET_PHOTOS} real photos. Remove photos with ×, or add new ones before saving.
                  </span>
                </div>

                <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
                  Documents{" "}
                  <span className="log-sect__soft">(verification)</span>
                </p>
                <p className="log-hint log-field--full">
                  Upload PDF or image files. Expiry dates marked * are required.{" "}
                  {REMINDER_HINT} From the day after a road licence (ZINARA) expires, the unit is
                  hidden from customers until you upload the renewed one. Other documents only warn you.
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
                        <li key={d.id} className="log-doc-row" data-field={`doc-${d.id}`}>
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
                            <small className="log-doc-row__rule">
                              {docRuleHint(d.id, { kind: asset?.kind, redPlate: Boolean(form.red_plate) })}
                            </small>
                          </span>
                          <label className="log-doc-row__expiry">
                            <span>
                              Expiry date
                              {ASSET_COMPLIANCE_TYPES.includes(d.id) && (entry.file || entry.url) ? (
                                <span className="log-req"> *</span>
                              ) : null}
                            </span>
                            <LogisticsDateInput
                              pickerOnly
                              value={entry.expires || ""}
                              onChange={(e) =>
                                onDocExpiry(d.id, e.target.value)
                              }
                              required={ASSET_COMPLIANCE_TYPES.includes(d.id) && Boolean(entry.file || entry.url)}
                              min={tomorrowYmd()}
                            />
                            {(entry.file || entry.url) && !entry.expires && ASSET_COMPLIANCE_TYPES.includes(d.id) ? (
                              <span className="log-field-error">Expiry date is required</span>
                            ) : null}
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
                              accept={DOC_ACCEPT}
                              hidden
                              onChange={(e) => {
                                const [f] = keepAllowedFiles(e.target.files);
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

                {asset?.kind === "equipment" ? (
                  <div className="log-field log-rate-field" data-field="price">
                    <span className="log-fl">Rate (optional)</span>
                    <div className="log-rate-row">
                      <LogisticsMoneyInput
                        value={form.price}
                        onChange={(v) => setForm((f) => ({ ...f, price: v }))}
                        aria-label={form.rate_unit === "hour" ? "Price per hour" : "Price per day"}
                      />
                      <div className="log-rate-toggle" role="radiogroup" aria-label="Rate unit">
                        {[
                          ["day", "Per day"],
                          ["hour", "Per hour"],
                        ].map(([u, label]) => (
                          <button
                            key={u}
                            type="button"
                            role="radio"
                            aria-checked={form.rate_unit === u}
                            className={form.rate_unit === u ? "is-on" : ""}
                            onClick={() => setForm((f) => ({ ...f, rate_unit: u }))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

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
                    <strong>{typeLabel || kindLabel}</strong>
                  </div>
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
                  {asset.kind === "cab" ? null : (
                    <div className="log-detail-item" data-testid="operating-range-value">
                      <span className="log-fl">Operating range</span>
                      <strong>
                        {asset.operating_range_km ? `${asset.operating_range_km} km` : `Default (${logisticsConfig?.default_operating_range_km ?? 100} km)`}
                      </strong>
                    </div>
                  )}
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
                        ? `${asset.capacity.value} ${asset.capacity.unit || "tons"}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Availability</span>
                    <strong>{avail}</strong>
                  </div>
                  <div className="log-detail-item">
                    <span className="log-fl">Carriage</span>
                    <strong>
                      {formatCarriageSize(asset.carriage) || "—"}
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
                      <span className="log-fl">Rate</span>
                      <strong>{formatRate(asset.price_hint, { negotiable: false })}</strong>
                    </div>
                  ) : null}
                </div>

                <p className="log-sect">Photos</p>
                {rejectedPhotos.length ? (
                  <div className="log-callout log-callout--warn" data-testid="photos-rejected" style={{ marginBottom: 12 }}>
                    <p>
                      <strong>
                        Simba Tasker rejected {rejectedPhotos.length} photo{rejectedPhotos.length === 1 ? "" : "s"}.
                      </strong>{" "}
                      {rejectedPhotos[0].reason ? `${rejectedPhotos[0].reason}. ` : ""}
                      Customers don&apos;t see rejected photos. Use Edit to add a new one.
                    </p>
                  </div>
                ) : null}
                {photos.length ? (
                  <div className="log-job-gallery" data-doc-anchor="photo">
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
                      const chip = docExpiryChip(doc.expires);
                      const showChip =
                        ASSET_COMPLIANCE_TYPES.includes(doc.type) || chip.status !== "no_expiry";
                      return (
                      <li
                        // type + url: two documents can share one uploaded file path
                        key={`${doc.type || "doc"}-${doc.url || ""}-${idx}`}
                        className="log-doc-row"
                        data-doc-anchor={doc.type || undefined}
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
                            {doc.expires ? ` · expires ${fmtExpiry(doc.expires)}` : ""}
                          </p>
                          <DocWarning doc={doc} />
                        </span>
                        {showChip ? (
                          <span className={`log-chip log-chip--${chip.tone}`}>{chip.label}</span>
                        ) : null}
                        {docReviewChip(doc.review) ? (
                          <span
                            className={`log-chip log-chip--${docReviewChip(doc.review).tone} log-doc-review`}
                            data-review={doc.review?.status}
                          >
                            {docReviewChip(doc.review).label}
                          </span>
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
                        <LogisticsDocReplace
                          doc={doc}
                          type={doc.type}
                          label={DOC_LABELS[doc.type] || doc.type}
                          needsExpiry={ASSET_COMPLIANCE_TYPES.includes(doc.type)}
                          onUpload={(file, expires) => replaceDoc(doc.type, file, expires)}
                        />
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
                  Every unit needs someone to operate it to be bookable. One
                  operator can cover several units, and you can use a unit
                  yourself while no operator is on it. You can pick someone
                  whose invite is still pending.
                </p>
                <UnitOperateControl asset={asset} onChanged={load} />
              </div>
              {ownerOnUnit ? null : (
                <Link
                  className="logistics-cta logistics-cta--ghost"
                  to="/logistics/owner/operators"
                >
                  Manage operators
                </Link>
              )}
            </div>

            {ownerOnUnit ? null : (
            <>
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
                        {[
                          op.email,
                          op.phone_number
                            ? `${op.country_code || DEFAULT_COUNTRY_CODE} ${op.phone_number}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
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

            {assetInvites.length ? (
              <ul className="log-doc-list" style={{ marginBottom: 14 }}>
                {assetInvites.map((inv) => (
                  <li key={inv.invite_id} className="log-doc-row">
                    <span className="log-doc-row__body">
                      <b>
                        {inv.full_name || inv.email}{" "}
                        <span className="log-chip log-chip--pending">
                          {inv.invite_state === "opened" ? "Invite opened" : "Invite pending"}
                        </span>
                      </b>
                      <p>Assigned automatically when they accept the invite.</p>
                    </span>
                    <button
                      type="button"
                      className="logistics-cta logistics-cta--ghost"
                      disabled={saving}
                      onClick={() => removeInvite(inv.invite_id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

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
                  disabled={(!availableDrivers.length && !availableInvites.length) || saving}
                >
                  <option value="">
                    {drivers.length || ownerInvites.length
                      ? availableDrivers.length || availableInvites.length
                        ? "Select operator…"
                        : "All operators already assigned"
                      : "No operators yet — invite from Operators"}
                  </option>
                  {availableDrivers.length ? (
                    <optgroup label="Active operators">
                      {availableDrivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.full_name || d.email}
                          {d.email ? ` · ${d.email}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {availableInvites.length ? (
                    <optgroup label="Invite pending (assigned on acceptance)">
                      {availableInvites.map((inv) => (
                        <option key={inv._id} value={`invite:${inv._id}`}>
                          {inv.full_name || inv.email} · invite pending
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
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
            </>
            )}
          </div>
        </>
      )}
    </LogisticsPageShell>
  );
}
