/**
 * Detect equipment hire (non-truck) jobs vs transport logistics.
 */
export function isCabJob(job) {
  if (!job) return false;
  if (job.required_asset_kind === "cab") return true;
  return (
    String(job.hub_category || "").toLowerCase() === "cab" ||
    job.job_type === "ride"
  );
}

export function isEquipmentJob(job) {
  if (!job) return false;
  if (job.required_asset_kind === "equipment") return true;
  if (job.required_asset_kind === "vehicle") return false;
  if (isCabJob(job)) return false;
  const hub = String(job.hub_category || "").toLowerCase();
  if (hub && hub !== "logistic") return true;
  if (job.job_type === "equipment_hire") return true;
  if (job.budget?.rate_unit === "hour" || job.budget?.rate_unit === "day") {
    return true;
  }
  return false;
}

/** Site for plant hire — stored as pickup (= dropoff) on the job. */
export function jobSite(job) {
  if (!job) return null;
  return job.pickup || job.dropoff || null;
}

const PLANT_HUB_KEYS = ["agricultural", "construction", "industrial"];

/** Category tile a job belongs to: logistic | agricultural | construction | industrial | cab */
export function jobCategoryKey(job) {
  if (isCabJob(job)) return "cab";
  if (isEquipmentJob(job)) {
    const hub = String(job?.hub_category || "").toLowerCase().trim();
    return PLANT_HUB_KEYS.includes(hub) ? hub : "agricultural";
  }
  return "logistic";
}

/** Hub category key → display label (Logistic / Agricultural / …). */
export function hubCategoryLabel(hubOrJob) {
  const hub = String(
    typeof hubOrJob === "object" && hubOrJob
      ? hubOrJob.hub_category || ""
      : hubOrJob || ""
  )
    .toLowerCase()
    .trim();
  if (!hub || hub === "logistic" || hub === "logistics") return "Logistic";
  if (hub === "agricultural") return "Agricultural";
  if (hub === "construction") return "Construction";
  if (hub === "industrial") return "Industrial";
  if (hub === "cab") return "Cab";
  return hub.charAt(0).toUpperCase() + hub.slice(1);
}

/**
 * Plant jobs store Equipment · Subtype in `load_type`.
 * Transport jobs use `load_type` as the cargo string.
 */
export function parseJobLoadSpec(job) {
  const raw = String(job?.load_type || "").trim();
  const plant = isEquipmentJob(job);
  if (!plant) {
    return {
      plant: false,
      load_type: raw || null,
      equipment: null,
      subtype: null,
    };
  }
  if (!raw) {
    return { plant: true, load_type: null, equipment: null, subtype: null };
  }
  const parts = raw
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return {
      plant: true,
      load_type: raw,
      equipment: parts[0],
      subtype: parts.slice(1).join(" · "),
    };
  }
  return {
    plant: true,
    load_type: raw,
    equipment: parts[0] || raw,
    subtype: null,
  };
}

/** Logistic vs non-logistic chip for Opportunities / nearby lists. */
export function jobKindTypeChip(job) {
  if (isCabJob(job)) {
    const cls = job?.ride?.cab_class
      ? job.ride.cab_class.charAt(0).toUpperCase() + job.ride.cab_class.slice(1)
      : "";
    return {
      plant: false,
      cab: true,
      label: cls ? `Cab · ${cls}` : "Cab",
      className: "log-chip log-chip--logistic",
      title: "Cab ride (passengers)",
    };
  }
  const plant = isEquipmentJob(job);
  if (!plant) {
    return {
      plant: false,
      label: "Logistic",
      className: "log-chip log-chip--logistic",
      title: "Logistic / transport truck job",
    };
  }
  const hub = hubCategoryLabel(job);
  return {
    plant: true,
    label: hub === "Equipment" ? "Non-logistic" : `Non-logistic · ${hub}`,
    className: "log-chip log-chip--plant",
    title: `Non-logistic equipment hire (${hub})`,
  };
}

/** Direct Book (?asset=) vs open marketplace task. */
export function isDirectBookJob(job) {
  return Boolean(job?.targeted_asset_id);
}
