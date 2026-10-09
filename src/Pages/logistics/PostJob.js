import { useEffect, useMemo, useState } from "react";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsCategoryTiles, {
  isCabCategory,
  isPlantCategory,
} from "../../CommanComponents/LogisticsCategoryTiles";
import CabRideForm, { cabFormFrom } from "./CabRideForm";
import {
  EquipmentPickerModal,
  LogisticsPickField,
  SubtypePickerModal,
} from "../../CommanComponents/LogisticsEquipmentPickers";
import LogisticsLocationField from "../../CommanComponents/LogisticsLocationField";
import {
  IconBolt,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconCloudUpload,
  IconCube,
  IconDoc,
  IconDollar,
  IconGallery,
  IconPlusCircle,
  IconTruck,
  IconWeight,
  LogFieldLabel,
  IconSend,
} from "../../CommanComponents/LogisticsFormIcons";
import {
  CAPACITY_TIER_OPTIONS,
  TRUCK_BODY_TYPES,
  assetBodyType,
  assetCapacityTons,
  assetMaxTons,
  capacityToTier,
  normalizeVehicleNeededLabel,
  suggestVehicleForWeight,
  vehicleMaxTons,
  vehiclesForWeightTons,
  weightExceedsMax,
  weightExceedsVehicle,
} from "../../utils/logisticVehicleWeight";
import {
  formatMoneyInputValue,
  parseLogisticsMoney,
} from "../../utils/logisticsMoney";
import "./logistics.css";
import {
  LogisticsFormSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";

const KG_PER_TON = 1000;

function toTons(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === "kg" ? n / KG_PER_TON : n;
}

function formatTons(tons) {
  if (tons == null) return "";
  const rounded = Math.round(tons * 10000) / 10000;
  return `${rounded} ton${rounded === 1 ? "" : "s"}`;
}

// Local-calendar YYYY-MM-DD, offsetDays from today (for date input min).
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const defaultForm = {
  category: "logistic",
  pickup: "",
  dropoff: "",
  pickup_coords: null,
  dropoff_coords: null,
  goods: "",
  weight: "",
  weight_unit: "tons",
  date: "",
  // Logistic open post: "date" → corridor, "now" → local (expiry window from server .env)
  when_mode: "date",
  vehicle_needed: "below 2 ton",
  truck_type: "regular",
  budget: "",
  budget_negotiable: true,
  priority: false,
  return_trip: false,
  return_goods: "",
  return_weight: "",
  return_weight_unit: "tons",
  special_notes: "",
  equipment: "Tractor",
  subtype: "Compact",
  site: "",
  site_coords: null,
  hire_from: "",
  // Date the job was loaded with (edit): an older post may keep it unchanged
  orig_date: "",
  hire_to: "",
  plant_budget: "",
  plant_budget_unit: "day",
  plant_note: "",
};

function jobToForm(job) {
  const notes = String(job.special_notes || "");
  const vehicleMatch = notes.match(/Vehicle:\s*([^·]+)/);
  const truckMatch = notes.match(/Truck type:\s*([^·]+)/);
  const samePlace =
    job.pickup?.address &&
    job.pickup.address === job.dropoff?.address &&
    !vehicleMatch;
  const parts = String(job.load_type || "").split(" · ");

  if (samePlace) {
    return {
      ...defaultForm,
      category: "agricultural",
      equipment: parts[0] || "Tractor",
      subtype: parts[1] || "Compact",
      site: job.pickup?.address || "",
      site_coords: job.pickup?.coordinates || null,
      hire_from: toDateInput(job.when_needed),
      hire_to: toDateInput(job.when_needed),
      orig_date: toDateInput(job.when_needed),
      plant_budget:
        job.budget?.amount != null
          ? formatMoneyInputValue(job.budget.amount)
          : "",
      plant_budget_unit: job.budget?.rate_unit === "hour" ? "hour" : "day",
      budget_negotiable: job.budget?.negotiable !== false,
      plant_note: notes,
      priority: !!job.priority,
    };
  }

  return {
    ...defaultForm,
    category: "logistic",
    pickup: job.pickup?.address || "",
    dropoff: job.dropoff?.address || "",
    pickup_coords: job.pickup?.coordinates || null,
    dropoff_coords: job.dropoff?.coordinates || null,
    goods: job.load_type || "",
    weight:
      job.load_weight?.value != null ? String(job.load_weight.value) : "",
    weight_unit: job.load_weight?.unit === "kg" ? "kg" : "tons",
    date: toDateInput(job.when_needed),
    orig_date: toDateInput(job.when_needed),
    when_mode: job.job_class === "local" ? "now" : "date",
    vehicle_needed: normalizeVehicleNeededLabel(
      vehicleMatch ? vehicleMatch[1].trim() : "below 2 ton"
    ),
    truck_type: (() => {
      const raw = truckMatch ? truckMatch[1].trim() : "";
      if (TRUCK_BODY_TYPES.includes(raw)) return raw;
      return "regular";
    })(),
    budget:
      job.budget?.amount != null
        ? formatMoneyInputValue(job.budget.amount)
        : "",
    budget_negotiable: job.budget?.negotiable !== false,
    priority: !!job.priority,
    return_trip: !!job.return_trip,
    return_goods: job.return_trip?.goods || "",
    return_weight:
      job.return_trip?.weight?.value != null
        ? String(job.return_trip.weight.value)
        : "",
    return_weight_unit:
      job.return_trip?.weight?.unit === "kg" ? "kg" : "tons",
    special_notes: notes
      .replace(/Vehicle:\s*[^·]+/g, "")
      .replace(/Truck type:\s*[^·]+/g, "")
      .replace(/Return:\s*[^·]+/g, "")
      .replace(/\s*·\s*/g, " ")
      .trim(),
  };
}

const HUB_KEYS = ["agricultural", "construction", "industrial"];

function hubFromAsset(asset) {
  if (!asset) return "logistic";
  if (String(asset.kind) === "cab") return "cab";
  if (String(asset.kind) === "equipment") {
    const fromServices = (asset.services || [])
      .map((s) => String(s || "").toLowerCase().trim())
      .find((s) => HUB_KEYS.includes(s));
    return fromServices || "agricultural";
  }
  return "logistic";
}

function parseAssetCapabilities(asset) {
  const caps = asset?.capabilities || [];
  let equipment = "";
  let subtype = "";
  let vehicleType = "";
  for (const raw of caps) {
    const c = String(raw || "").trim();
    if (!c) continue;
    const lower = c.toLowerCase();
    if (lower.startsWith("subtype:")) {
      subtype = c.slice(c.indexOf(":") + 1).trim();
      continue;
    }
    if (lower.startsWith("mobility:") || lower.startsWith("engine:") || lower.startsWith("vin:")) {
      continue;
    }
    if (!equipment) equipment = c;
    if (!vehicleType) vehicleType = c;
  }
  return { equipment, subtype, vehicleType };
}

function formFromTargetAsset(asset) {
  const category = hubFromAsset(asset);
  const plant = isPlantCategory(category);
  const { equipment, subtype } = parseAssetCapabilities(asset);
  if (plant) {
    return {
      ...defaultForm,
      category,
      equipment: equipment || "Tractor",
      subtype: subtype || "Compact",
      plant_budget:
        asset.price_hint?.amount != null
          ? formatMoneyInputValue(asset.price_hint.amount)
          : "",
      // Booking a unit priced per hour starts the budget per hour too
      plant_budget_unit: asset.price_hint?.unit === "hour" ? "hour" : "day",
    };
  }
  return {
    ...defaultForm,
    category: "logistic",
    vehicle_needed:
      capacityToTier(assetCapacityTons(asset)) || "below 2 ton",
    truck_type: assetBodyType(asset) || "regular",
  };
}

export default function LogisticsPostJob() {
  const dispatch = useDispatch();
  // "Now" window comes from backend .env (LOGISTICS_NOW_JOB_EXPIRY_MINUTES) via session
  const [nowMinutes, setNowMinutes] = useState(30);
  useEffect(() => {
    let alive = true;
    dispatch(LogisticsActions.getSession()).then((res) => {
      const m = Number(res?.payload?.data?.config?.now_job_expiry_minutes);
      if (alive && Number.isFinite(m) && m > 0) setNowMinutes(m);
    });
    return () => {
      alive = false;
    };
  }, [dispatch]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const targetAssetId = searchParams.get("asset");
  const [form, setForm] = useState(() =>
    searchParams.get("category") === "cab" && !editId && !targetAssetId
      ? { ...defaultForm, category: "cab" }
      : defaultForm
  );
  // Cab ride (hub "cab") uses its own form; prefilled on edit / direct cab book
  const [cabInitial, setCabInitial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [loadingTarget, setLoadingTarget] = useState(
    Boolean(targetAssetId) && !editId
  );
  const [targetAsset, setTargetAsset] = useState(null);
  const [equipOpen, setEquipOpen] = useState(false);
  const [subtypeOpen, setSubtypeOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [returnImageFiles, setReturnImageFiles] = useState([]);
  const [existingReturnImages, setExistingReturnImages] = useState([]);
  const plant = isPlantCategory(form.category);
  const categoryLocked = Boolean(targetAsset) && !editId;
  // "Now" is for open logistic posts only (direct bookings are future-dated)
  const nowMode = !plant && !categoryLocked && form.when_mode === "now";

  const previews = useMemo(
    () =>
      imageFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [imageFiles]
  );

  const returnPreviews = useMemo(
    () =>
      returnImageFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [returnImageFiles]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  useEffect(() => {
    return () => {
      returnPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [returnPreviews]);
  useEffect(() => {
    if (!editId) {
      setLoadingEdit(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const res = await dispatch(LogisticsActions.getJob(editId));
      if (cancelled) return;
      const job = res?.payload?.data?.job;
      const quotes = res?.payload?.data?.quotations || [];
      if (!job) {
        toast.error("Job not found");
        navigate("/logistics/jobs");
        return;
      }
      if (Number(job.status) !== 0 || quotes.length > 0) {
        toast.error("This job can no longer be edited");
        navigate(`/logistics/jobs/${editId}`);
        return;
      }
      if (String(job.hub_category) === "cab") {
        setCabInitial(cabFormFrom({ job }));
        setForm({ ...defaultForm, category: "cab" });
        setLoadingEdit(false);
        return;
      }
      setForm(jobToForm(job));
      setExistingReturnImages(
        Array.isArray(job.return_trip?.images) ? job.return_trip.images : []
      );
      setReturnImageFiles([]);
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, editId, navigate]);

  useEffect(() => {
    if (!targetAssetId || editId) {
      setLoadingTarget(false);
      setTargetAsset(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingTarget(true);
      const res = await dispatch(LogisticsActions.getAsset(targetAssetId));
      if (cancelled) return;
      const asset = res?.payload?.data?.asset;
      if (!asset) {
        toast.error("That vehicle or equipment was not found");
        navigate("/logistics/post", { replace: true });
        setLoadingTarget(false);
        return;
      }
      setTargetAsset(asset);
      if (String(asset.kind) === "cab") {
        setCabInitial(cabFormFrom({ asset }));
        setForm({ ...defaultForm, category: "cab" });
        setLoadingTarget(false);
        return;
      }
      setForm(formFromTargetAsset(asset));
      setLoadingTarget(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, targetAssetId, editId, navigate]);

  const weightTons = toTons(form.weight, form.weight_unit);
  const returnTons = toTons(form.return_weight, form.return_weight_unit);

  const lockedVehicleMaxTons = useMemo(() => {
    if (!categoryLocked || plant) return null;
    return assetMaxTons(targetAsset, form.vehicle_needed);
  }, [categoryLocked, plant, targetAsset, form.vehicle_needed]);

  const openVehicleMaxTons = useMemo(() => {
    if (plant || categoryLocked) return null;
    return vehicleMaxTons(form.vehicle_needed);
  }, [plant, categoryLocked, form.vehicle_needed]);

  const weightCapTons = lockedVehicleMaxTons ?? openVehicleMaxTons;
  const vehicleOptions = useMemo(() => {
    if (plant) return [];
    if (categoryLocked) {
      const v = form.vehicle_needed;
      if (v && !CAPACITY_TIER_OPTIONS.includes(v)) return [v];
      return [v || "below 2 ton"];
    }
    return vehiclesForWeightTons(weightTons);
  }, [plant, categoryLocked, form.vehicle_needed, weightTons]);

  const truckTypeOptions = useMemo(() => {
    if (plant) return [];
    if (categoryLocked) {
      const t = form.truck_type;
      if (t && !TRUCK_BODY_TYPES.includes(t)) return [t];
      return [t || "regular"];
    }
    return TRUCK_BODY_TYPES;
  }, [plant, categoryLocked, form.truck_type]);

  useEffect(() => {
    if (plant || categoryLocked) return;
    if (!vehicleOptions.length) return;
    if (vehicleOptions.includes(form.vehicle_needed)) return;
    setForm((f) => ({
      ...f,
      vehicle_needed: suggestVehicleForWeight(
        toTons(f.weight, f.weight_unit),
        f.vehicle_needed
      ),
    }));
  }, [plant, categoryLocked, vehicleOptions, form.vehicle_needed]);

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  // LogisticsMoneyInput passes the already-sanitized string
  const setMoney = (key) => (next) => {
    setForm((f) => ({ ...f, [key]: next }));
  };

  // Weight can't go above the chosen Vehicle needed size (or the locked unit's
  // capacity): an over-limit entry is clamped to the max with a toast. To carry
  // more, the customer picks a bigger Vehicle needed first.
  const weightCapFor = (f) => {
    if (plant) return null;
    if (categoryLocked) return lockedVehicleMaxTons;
    return vehicleMaxTons(f.vehicle_needed);
  };

  const capWeight = (f, weight, unit) => {
    const max = weightCapFor(f);
    if (max == null || !weightExceedsMax(toTons(weight, unit), max)) {
      return { ...f, weight, weight_unit: unit };
    }
    // toastId: one toast even when React re-runs this updater (StrictMode)
    toast.error(
      categoryLocked
        ? `This unit can take up to ${max} tons — lower the package weight.`
        : `Vehicle needed “${f.vehicle_needed}” takes up to ${max} tons. Pick a larger vehicle to carry more.`,
      { toastId: "post-weight-cap" }
    );
    return { ...f, weight: String(unit === "kg" ? max * 1000 : max), weight_unit: unit };
  };

  const onWeightChange = (e) => {
    const nextWeight = e.target.value;
    setForm((f) => capWeight(f, nextWeight, f.weight_unit));
  };

  const onWeightUnitChange = (e) => {
    const nextUnit = e.target.value;
    setForm((f) => capWeight(f, f.weight, nextUnit));
  };

  const onVehicleNeededChange = (e) => {
    const nextVehicle = e.target.value;
    setForm((f) => {
      const tons = toTons(f.weight, f.weight_unit);
      const max = vehicleMaxTons(nextVehicle);
      if (tons != null && tons > max) {
        toast.error(
          `Weight exceeds ${nextVehicle} capacity (max ${max} tons). Lower the weight or pick a larger vehicle.`
        );
        return f;
      }
      return { ...f, vehicle_needed: nextVehicle };
    });
  };

  const onLocation = (field, coordsField) => ({ address, coords }) => {
    setForm((f) => ({
      ...f,
      [field]: address || "",
      [coordsField]: coords,
    }));
  };

  const onPickImages = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setImageFiles((prev) => [...prev, ...picked].slice(0, 10));
  };

  const removeImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onPickReturnImages = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setReturnImageFiles((prev) => [...prev, ...picked].slice(0, 10));
  };

  const removeReturnImage = (idx) => {
    setReturnImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingReturnImage = (idx) => {
    setExistingReturnImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateLogistic = () => {
    if (!String(form.pickup || "").trim() || !form.pickup_coords) {
      toast.error("Choose Pick up from on the map");
      return false;
    }
    if (!String(form.dropoff || "").trim() || !form.dropoff_coords) {
      toast.error("Choose Deliver to on the map");
      return false;
    }
    if (weightTons == null || weightTons <= 0) {
      toast.error("Weight is required");
      return false;
    }
    if (categoryLocked && lockedVehicleMaxTons != null) {
      if (weightExceedsMax(weightTons, lockedVehicleMaxTons)) {
        toast.error(
          `This unit can take up to ${lockedVehicleMaxTons} tons — lower the package weight.`
        );
        return false;
      }
    } else if (weightExceedsVehicle(weightTons, form.vehicle_needed)) {
      const max = vehicleMaxTons(form.vehicle_needed);
      toast.error(
        `Weight exceeds ${form.vehicle_needed} (max ${max} tons). Choose a larger vehicle or lower the weight.`
      );
      return false;
    }
    if (!categoryLocked && weightTons > 50) {
      toast.error("Maximum package weight for posted jobs is 50 tons");
      return false;
    }
    if (!nowMode) {
      if (!form.date) {
        toast.error("Date is required");
        return false;
      }
      // Dated jobs start tomorrow; today is what Now is for (v2.7.34)
      if (form.date < localDateStr(1) && form.date !== form.orig_date) {
        toast.error(
          categoryLocked
            ? "Direct bookings must be for a future date (tomorrow or later)"
            : "Scheduled jobs are for tomorrow or later — choose Now for today"
        );
        return false;
      }
    }
    if (form.budget === "" || form.budget == null) {
      toast.error("Price is required");
      return false;
    }
    const priceCheck = parseLogisticsMoney(form.budget, { field: "Price" });
    if (!priceCheck.ok) {
      toast.error(priceCheck.message);
      return false;
    }
    return true;
  };

  const validatePlant = () => {
    if (!String(form.equipment || "").trim()) {
      toast.error("Equipment is required");
      return false;
    }
    if (!String(form.subtype || "").trim()) {
      toast.error("Sub type is required");
      return false;
    }
    if (!String(form.site || "").trim() || !form.site_coords) {
      toast.error("Choose Site location on the map");
      return false;
    }
    if (!form.hire_from) {
      toast.error("From date is required");
      return false;
    }
    if (!form.hire_to) {
      toast.error("To date is required");
      return false;
    }
    if (form.hire_from < localDateStr(1) && form.hire_from !== form.orig_date) {
      toast.error(
        categoryLocked
          ? "Direct bookings must be for a future date (tomorrow or later)"
          : "Equipment hire must start tomorrow or later"
      );
      return false;
    }
    if (
      form.hire_from &&
      form.hire_to &&
      new Date(form.hire_to) < new Date(form.hire_from)
    ) {
      toast.error("To date must be on or after From date");
      return false;
    }
    const budgetCheck = parseLogisticsMoney(form.plant_budget, {
      field: "Budget",
    });
    if (!budgetCheck.ok) {
      toast.error(budgetCheck.message);
      return false;
    }
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!plant && !validateLogistic()) return;
    if (plant && !validatePlant()) return;

    setSaving(true);
    try {
      const pickupCoords = plant ? form.site_coords : form.pickup_coords;
      const dropoffCoords = plant ? form.site_coords : form.dropoff_coords;
      const lockedHub = categoryLocked
        ? hubFromAsset(targetAsset)
        : form.category || (plant ? "agricultural" : "logistic");

      const jobPayload = {
        job_type: plant ? "equipment_hire" : "transport",
        hub_category: lockedHub,
        // Server fixes job_class at create: Now → local (expires after the server's window)
        job_class: nowMode ? "local" : "corridor",
        ...(nowMode ? { need_now: true } : {}),
        load_type: plant
          ? [form.equipment, form.subtype].filter(Boolean).join(" · ") ||
            "Equipment"
          : form.goods || "General",
        load_weight: {
          value: Number(form.weight) || (plant ? 0 : 1),
          unit: form.weight_unit || "tons",
        },
        pickup: {
          address: plant ? form.site : form.pickup,
          coordinates: pickupCoords,
        },
        dropoff: {
          address: plant ? form.site : form.dropoff,
          coordinates: dropoffCoords,
        },
        when_needed: nowMode
          ? undefined
          : form.date || form.hire_from || undefined,
        priority: !!form.priority,
        special_notes: plant
          ? form.plant_note
          : [
              form.special_notes,
              form.vehicle_needed ? `Vehicle: ${form.vehicle_needed}` : "",
              form.truck_type ? `Truck type: ${form.truck_type}` : "",
              form.return_trip
                ? `Return: ${form.return_goods || "goods"} (${
                    returnTons != null
                      ? formatTons(returnTons)
                      : form.return_weight
                  })`
                : "",
            ]
              .filter(Boolean)
              .join(" · "),
        return_trip: form.return_trip
          ? {
              goods: form.return_goods,
              weight: {
                value: Number(form.return_weight) || 0,
                unit: form.return_weight_unit || "tons",
              },
              weight_tons: returnTons,
              images: existingReturnImages.slice(0, 10),
            }
          : null,
        budget: {
          amount: plant
            ? parseLogisticsMoney(form.plant_budget, { field: "Budget" }).value
            : parseLogisticsMoney(form.budget, { field: "Price" }).value,
          currency: "USD",
          negotiable: Boolean(form.budget_negotiable),
          ...(plant && form.plant_budget
            ? { rate_unit: form.plant_budget_unit === "hour" ? "hour" : "day" }
            : {}),
        },
        ...(categoryLocked && targetAssetId
          ? { targeted_asset_id: targetAssetId }
          : {}),
      };

      if (editId) {
        const res = await dispatch(
          LogisticsActions.updateJob({ jobId: editId, payload: jobPayload })
        );
        if (res?.payload?.success) {
          if (imageFiles.length || returnImageFiles.length) {
            await dispatch(
              LogisticsActions.uploadJobImages({
                jobId: editId,
                files: imageFiles,
                returnFiles: form.return_trip ? returnImageFiles : [],
              })
            );
          }
          toast.success("Job updated");
          navigate(`/logistics/jobs/${editId}`);
        } else {
          toast.error(res?.payload?.message || "Could not update job");
        }
        return;
      }

      const fd = new FormData();
      fd.append("data", JSON.stringify(jobPayload));
      imageFiles.forEach((file) => fd.append("images", file));
      if (form.return_trip) {
        returnImageFiles.forEach((file) => fd.append("return_images", file));
      }

      const res = await dispatch(LogisticsActions.createJob(fd));
      if (res?.payload?.success) {
        toast.success("Job posted");
        navigate(`/logistics/jobs/${res.payload.data.job._id}`);
      } else {
        toast.error(res?.payload?.message || "Could not post job");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit || loadingTarget) {
    return (
      <LogisticsPageShell
        title={editId ? "Edit job" : "Post a job"}
        crumbLabel={editId ? "Edit job" : "Post a job"}
      >
        <LogisticsFormSkeleton fields={8} label="Loading job" />
      </LogisticsPageShell>
    );
  }

  if (isCabCategory(form.category)) {
    return (
      <LogisticsPageShell
        title={editId ? "Edit ride" : "Book a cab"}
        crumbLabel={editId ? "Edit ride" : "Book a cab"}
      >
        {/* Banner + tiles render inside the ride form card, same as the other categories */}
        <CabRideForm
          initial={cabInitial || undefined}
          editId={editId}
          targetAsset={categoryLocked ? targetAsset : null}
          header={
            <>
              {categoryLocked && targetAsset ? (
                <div className="log-target-banner" role="status">
                  <span>
                    Ride request for <b>{targetAsset.name || "selected cab"}</b>
                    {targetAsset.registration ? ` · ${targetAsset.registration}` : ""}. Only
                    this fleet is notified.
                  </span>
                </div>
              ) : null}
              <LogisticsCategoryTiles
                value={form.category}
                locked={categoryLocked || Boolean(editId)}
                onChange={(category) => {
                  if (categoryLocked || editId) return;
                  setForm((f) => ({ ...f, category }));
                }}
              />
            </>
          }
        />
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell
      title={editId ? "Edit job" : "Post a job"}
      crumbLabel={editId ? "Edit job" : "Post a job"}
    >
      <form className="log-form-card log-form-card--post" onSubmit={submit} noValidate>
        {categoryLocked && targetAsset ? (
          <div className="log-target-banner" role="status">
            <span>
              Direct booking for <b>{targetAsset.name || "selected unit"}</b>
              {targetAsset.registration
                ? ` · ${targetAsset.registration}`
                : ""}
              . Only this fleet is notified — category stays locked.
            </span>
            <span className="log-target-banner__meta">
              {String(targetAsset.kind) === "equipment"
                ? "Equipment hire"
                : "Logistic / truck"}{" "}
              · {hubFromAsset(targetAsset)}
            </span>
          </div>
        ) : null}

        <LogisticsCategoryTiles
          value={form.category}
          locked={categoryLocked}
          hideCab={Boolean(editId)}
          onChange={(category) => {
            if (categoryLocked) return;
            setForm((f) => ({
              ...f,
              category,
              equipment: "Tractor",
              subtype: "Compact",
            }));
          }}
        />

        {!plant ? (
          <div className="log-form-grid">
            <LogisticsLocationField
              label="Pick up from"
              required
              address={form.pickup}
              coords={form.pickup_coords}
              title="Pick up location"
              onChange={onLocation("pickup", "pickup_coords")}
            />
            <LogisticsLocationField
              label="Deliver to"
              required
              address={form.dropoff}
              coords={form.dropoff_coords}
              title="Delivery location"
              onChange={onLocation("dropoff", "dropoff_coords")}
            />
            <label className="log-field">
              <LogFieldLabel icon={<IconTruck size={16} />}>
                Vehicle needed
                {categoryLocked ? (
                  <span className="log-cat-block__lock"> · Locked</span>
                ) : null}
              </LogFieldLabel>
              {categoryLocked && assetCapacityTons(targetAsset) != null ? (
                // Direct booking: show this truck's real capacity (e.g. 15 t),
                // not the size band it falls in ("20 ton")
                <input
                  readOnly
                  value={`Up to ${Number(assetCapacityTons(targetAsset)).toLocaleString()} t — ${targetAsset?.name || "this truck"}`}
                  aria-label="Vehicle capacity (this truck)"
                />
              ) : (
                <select
                  value={
                    vehicleOptions.includes(form.vehicle_needed)
                      ? form.vehicle_needed
                      : vehicleOptions[0] || form.vehicle_needed
                  }
                  onChange={onVehicleNeededChange}
                  disabled={categoryLocked}
                >
                  {vehicleOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </label>
            <label className="log-field">
              <LogFieldLabel icon={<IconTruck size={16} />}>
                Truck type
                {categoryLocked ? (
                  <span className="log-cat-block__lock"> · Locked</span>
                ) : null}
              </LogFieldLabel>
              <select
                value={
                  truckTypeOptions.includes(form.truck_type)
                    ? form.truck_type
                    : truckTypeOptions[0] || form.truck_type
                }
                onChange={set("truck_type")}
                disabled={categoryLocked}
              >
                {truckTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="log-field log-field--full">
              <LogFieldLabel icon={<IconCube size={16} />} required>
                Goods
              </LogFieldLabel>
              <input
                value={form.goods}
                onChange={set("goods")}
                placeholder="e.g. Construction materials"
              />
            </label>

            <div className="log-field">
              <LogFieldLabel icon={<IconWeight size={16} />} required>
                Weight
              </LogFieldLabel>
              <div className="log-weight-row">
                <input
                  type="number"
                  min="0"
                  step="any"
                  max={
                    weightCapTons != null
                      ? form.weight_unit === "kg"
                        ? weightCapTons * 1000
                        : weightCapTons
                      : undefined
                  }
                  value={form.weight}
                  onChange={onWeightChange}
                  placeholder="8"
                  required
                />
                <select
                  value={form.weight_unit}
                  onChange={onWeightUnitChange}
                  aria-label="Weight unit"
                >
                  <option value="tons">tons</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              {form.weight_unit === "kg" && weightTons != null ? (
                <span className="log-weight-hint">
                  Stored as <strong>{formatTons(weightTons)}</strong>
                </span>
              ) : null}
              {weightCapTons != null ? (
                <span className="log-weight-hint">
                  {categoryLocked
                    ? `Max ${weightCapTons} tons for this locked vehicle`
                    : `Up to ${weightCapTons} tons for Vehicle needed “${form.vehicle_needed}”`}
                </span>
              ) : null}
            </div>

            <div className="log-field">
              <LogFieldLabel icon={<IconCalendar size={16} />} required>
                When
              </LogFieldLabel>
              {!categoryLocked ? (
                <div className="log-when" role="radiogroup" aria-label="When">
                  {[
                    {
                      value: "date",
                      title: "Schedule",
                      sub: "Pick a day",
                      icon: <IconCalendar size={18} />,
                    },
                    {
                      value: "now",
                      title: "Now",
                      sub: `Needed within ${nowMinutes} min`,
                      icon: <IconBolt size={18} />,
                    },
                  ].map((opt) => {
                    const on = form.when_mode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`log-when__opt${on ? " on" : ""}${
                          opt.value === "now" ? " log-when__opt--now" : ""
                        }`}
                        disabled={Boolean(editId)}
                        onClick={() =>
                          setForm((f) => ({ ...f, when_mode: opt.value }))
                        }
                      >
                        <span className="log-when__pic">{opt.icon}</span>
                        <span className="log-when__text">
                          <b>{opt.title}</b>
                          <small>{opt.sub}</small>
                        </span>
                        {on ? (
                          <span className="log-when__check" aria-hidden="true">
                            <IconCheck size={11} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {nowMode ? (
                <div className="log-when-now">
                  <span className="log-when-now__pic">
                    <IconBolt size={16} />
                  </span>
                  <span>
                    <b>Needed right now</b>
                    Nearby operators are alerted instantly. Valid for{" "}
                    {nowMinutes} minutes — auto-cancels if no quote is
                    accepted.
                  </span>
                </div>
              ) : (
                <>
                  <LogisticsDateInput
                    value={form.date}
                    onChange={set("date")}
                    min={localDateStr(1)}
                    required
                  />
                  <span className="log-hint">
                    {categoryLocked
                      ? "Direct bookings are for tomorrow or later."
                      : "Schedule is for tomorrow or later. Need it today? Choose Now."}
                  </span>
                </>
              )}
            </div>

            <div className="log-field log-field--full">
              <LogFieldLabel icon={<IconGallery size={16} />}>
                Load photos
              </LogFieldLabel>
              <label className="log-upload log-upload--post">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickImages}
                />
                <span className="log-upload__stack" aria-hidden="true">
                  <span className="log-upload__frames">
                    <IconGallery size={22} />
                    <span className="log-upload__plus">
                      <IconPlusCircle size={16} />
                    </span>
                  </span>
                  <IconCloudUpload size={28} />
                </span>
                <span className="log-upload__copy">
                  <b>Load photos</b>
                  <small>Tap to upload images of your goods (up to 10)</small>
                </span>
              </label>
              {previews.length > 0 && (
                <div className="log-upload-previews">
                  {previews.map((p, idx) => (
                    <div key={p.url} className="log-upload-thumb">
                      <img src={p.url} alt={`Load ${idx + 1}`} />
                      <button
                        type="button"
                        className="log-upload-remove"
                        aria-label="Remove image"
                        onClick={() => removeImage(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="log-field">
              <LogFieldLabel icon={<IconDollar size={16} />} required>
                Price <em>(total both legs)</em>
              </LogFieldLabel>
              <LogisticsMoneyInput
                value={form.budget}
                onChange={setMoney("budget")}
                aria-label="Price"
                required
              />
            </label>
            <div className="log-check-row log-field--full">
              <label className="log-check log-check--row">
                <input
                  type="checkbox"
                  checked={form.priority}
                  onChange={set("priority")}
                />
                Priority job
              </label>
              <label className="log-check log-check--row">
                <input
                  type="checkbox"
                  checked={form.budget_negotiable}
                  onChange={set("budget_negotiable")}
                />
                <span>
                  Price negotiable
                  <small>
                    {form.budget_negotiable
                      ? "Operators can quote above or below your price."
                      : "Operators must quote this exact amount — the quote field is locked."}
                  </small>
                </span>
              </label>
              <label className="log-check log-check--row">
                <input
                  type="checkbox"
                  checked={form.return_trip}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setForm((f) => ({ ...f, return_trip: on }));
                    if (!on) {
                      setReturnImageFiles([]);
                      setExistingReturnImages([]);
                    }
                  }}
                />
                Return trip
              </label>
            </div>
            {form.return_trip && (
              <div className="log-return-panel log-field--full">
                <p>
                  Also bring goods back on the return leg. One total price covers
                  both legs — operators quote against that total.
                </p>
                <div className="log-form-grid">
                  <label className="log-field log-field--full">
                    <span className="log-fl">Return goods</span>
                    <input
                      value={form.return_goods}
                      onChange={set("return_goods")}
                    />
                  </label>
                  <div className="log-field">
                    <span className="log-fl">Return weight</span>
                    <div className="log-weight-row">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={form.return_weight}
                        onChange={set("return_weight")}
                        placeholder="2"
                      />
                      <select
                        value={form.return_weight_unit}
                        onChange={set("return_weight_unit")}
                        aria-label="Return weight unit"
                      >
                        <option value="tons">tons</option>
                        <option value="kg">kg</option>
                      </select>
                    </div>
                    {form.return_weight_unit === "kg" && returnTons != null ? (
                      <span className="log-weight-hint">
                        Stored as <strong>{formatTons(returnTons)}</strong>
                      </span>
                    ) : null}
                  </div>
                  <div className="log-field log-field--full">
                    <LogFieldLabel icon={<IconGallery size={16} />}>
                      Return load photos
                    </LogFieldLabel>
                    <label className="log-upload log-upload--post log-upload--compact">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onPickReturnImages}
                      />
                      <span className="log-upload__stack" aria-hidden="true">
                        <span className="log-upload__frames">
                          <IconGallery size={20} />
                          <span className="log-upload__plus">
                            <IconPlusCircle size={14} />
                          </span>
                        </span>
                        <IconCloudUpload size={24} />
                      </span>
                      <span className="log-upload__copy">
                        <b>Return load photos</b>
                        <small>
                          Photos of goods coming back on the return leg (up to 10)
                        </small>
                      </span>
                    </label>
                    {(existingReturnImages.length > 0 ||
                      returnPreviews.length > 0) && (
                      <div className="log-upload-previews">
                        {existingReturnImages.map((src, idx) => (
                          <div key={`ex-${src}-${idx}`} className="log-upload-thumb">
                            <img src={src} alt={`Return saved ${idx + 1}`} />
                            <button
                              type="button"
                              className="log-upload-remove"
                              aria-label="Remove image"
                              onClick={() => removeExistingReturnImage(idx)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {returnPreviews.map((p, idx) => (
                          <div key={p.url} className="log-upload-thumb">
                            <img src={p.url} alt={`Return ${idx + 1}`} />
                            <button
                              type="button"
                              className="log-upload-remove"
                              aria-label="Remove image"
                              onClick={() => removeReturnImage(idx)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <label className="log-field log-field--full">
              <LogFieldLabel icon={<IconDoc size={16} />}>
                Special notes
              </LogFieldLabel>
              <div className="log-textarea-wrap">
                <textarea
                  rows={3}
                  value={form.special_notes}
                  onChange={set("special_notes")}
                  placeholder="Crane offload at delivery — call on arrival"
                  maxLength={500}
                />
                <span className="log-textarea-count">
                  {String(form.special_notes || "").length}/500
                </span>
              </div>
            </label>
          </div>
        ) : (
          <div className="log-form-grid log-form-grid--plant">
            <div className="log-pick-row log-field--full">
              <LogisticsPickField
                label={
                  categoryLocked ? "Equipment · Locked" : "Equipment"
                }
                value={form.equipment}
                placeholder="Pick equipment"
                required
                onClick={() => {
                  if (!categoryLocked) setEquipOpen(true);
                }}
              />
              <LogisticsPickField
                label={categoryLocked ? "Sub type · Locked" : "Sub type"}
                value={form.subtype}
                placeholder="Pick sub type"
                required
                onClick={() => {
                  if (!categoryLocked) setSubtypeOpen(true);
                }}
              />
            </div>
            <p className="log-hint log-field--full">
              {categoryLocked
                ? "Equipment type is fixed for this direct booking."
                : "Sub type follows Equipment — e.g. Tractor size bands."}
            </p>
            <div className="log-field--full">
              <LogisticsLocationField
                label="Site location"
                required
                address={form.site}
                coords={form.site_coords}
                title="Site location"
                onChange={onLocation("site", "site_coords")}
              />
            </div>

            <div className="log-plant-dates log-field--full">
              <div className="log-field">
                <LogFieldLabel icon={<IconCalendar size={16} />} required>
                  From
                </LogFieldLabel>
                <LogisticsDateInput
                  className="log-date-input"
                  value={form.hire_from}
                  onChange={set("hire_from")}
                  min={localDateStr(1)}
                  required
                />
                <span className="log-hint">Hire starts tomorrow or later.</span>
              </div>
              <div className="log-field">
                <LogFieldLabel icon={<IconCalendar size={16} />} required>
                  To
                </LogFieldLabel>
                <LogisticsDateInput
                  className="log-date-input"
                  value={form.hire_to}
                  onChange={set("hire_to")}
                  min={form.hire_from || localDateStr(1)}
                  required
                />
              </div>
              <div className="log-field">
                <LogFieldLabel icon={<IconDollar size={16} />} required>
                  Budget
                </LogFieldLabel>
                <div className="log-weight-row">
                  <LogisticsMoneyInput
                    value={form.plant_budget}
                    onChange={setMoney("plant_budget")}
                    aria-label="Budget"
                    required
                  />
                  <select
                    value={form.plant_budget_unit}
                    onChange={set("plant_budget_unit")}
                    aria-label="Budget unit"
                  >
                    <option value="day">Days</option>
                    <option value="hour">Hrs</option>
                  </select>
                </div>
              </div>
            </div>

            <label className="log-check">
              <input
                type="checkbox"
                checked={form.budget_negotiable}
                onChange={set("budget_negotiable")}
              />
              <span>
                Budget negotiable
                <small>
                  {form.budget_negotiable
                    ? "Operators can quote above or below your budget."
                    : "Operators must quote this exact budget — the quote field is locked."}
                </small>
              </span>
            </label>

            <div className="log-field log-field--full">
              <LogFieldLabel icon={<IconGallery size={16} />}>
                Site / equipment photos
              </LogFieldLabel>
              <label className="log-upload log-upload--post log-upload--compact">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickImages}
                />
                <span className="log-upload__stack" aria-hidden="true">
                  <span className="log-upload__frames">
                    <IconGallery size={20} />
                    <span className="log-upload__plus">
                      <IconPlusCircle size={14} />
                    </span>
                  </span>
                  <IconCloudUpload size={24} />
                </span>
                <span className="log-upload__copy">
                  <b>Photos</b>
                  <small>Tap to upload photos (up to 10)</small>
                </span>
              </label>
              {previews.length > 0 && (
                <div className="log-upload-previews">
                  {previews.map((p, idx) => (
                    <div key={p.url} className="log-upload-thumb">
                      <img src={p.url} alt={`Photo ${idx + 1}`} />
                      <button
                        type="button"
                        className="log-upload-remove"
                        aria-label="Remove image"
                        onClick={() => removeImage(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label className="log-field log-field--full">
              <LogFieldLabel icon={<IconDoc size={16} />}>Note</LogFieldLabel>
              <div className="log-textarea-wrap">
                <textarea
                  rows={3}
                  value={form.plant_note}
                  onChange={set("plant_note")}
                  placeholder="Need a tractor with slasher for 3 days…"
                  maxLength={500}
                />
                <span className="log-textarea-count">
                  {String(form.plant_note || "").length}/500
                </span>
              </div>
            </label>
          </div>
        )}

        <div className="log-form-actions">
          <button
            className="logistics-cta logistics-cta--primary log-form-submit"
            type="submit"
            disabled={saving}
          >
            <IconSend size={18} />
            <span>
              {saving
                ? editId
                  ? "Saving…"
                  : "Posting…"
                : editId
                  ? "Save changes"
                  : "Post Job"}
            </span>
            {!saving ? <IconChevronRight size={16} /> : null}
          </button>
        </div>
      </form>

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
