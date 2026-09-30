/** Offline / first-paint fallback. Live source: GET /api/logistics/equipment-taxonomy */

export const EQUIPMENT_BY_CATEGORY = {
  agricultural: {
    title: "Agricultural equipment",
    lead: "Pick the machine you need — matching listings will quote.",
    sections: [
      {
        heading: "1 · Land preparation & soil tilling",
        items: [
          "Tractor",
          "Rotavator",
          "Mouldboard / Disc Plough",
          "Harrow",
          "Power Weeder",
        ],
      },
      {
        heading: "2 · Sowing & planting",
        items: ["Seed Drill", "Paddy Transplanter", "Potato / Vegetable Planter"],
      },
      {
        heading: "3 · Crop management & irrigation",
        items: [
          "Knapsack Sprayer",
          "Drip / Sprinkler Irrigation",
          "Cultivator",
        ],
      },
      {
        heading: "4 · Harvesting & threshing",
        items: ["Combine Harvester", "Multi-Crop Thresher", "Reaper"],
      },
      {
        heading: "5 · Post-harvest & transport",
        items: ["Tractor Trolley / Trailer", "Grain Dryer", "Grain Silo / Storage"],
      },
    ],
  },
  construction: {
    title: "Construction equipment",
    lead: "Pick the plant you need — matching listings will quote.",
    sections: [
      {
        heading: "1 · Earthmoving",
        items: ["Excavator", "Backhoe Loader", "Bulldozer", "Wheel Loader", "Grader"],
      },
      {
        heading: "2 · Lifting & access",
        items: ["Mobile Crane", "Tower Crane", "Boom Lift", "Scissor Lift"],
      },
      {
        heading: "3 · Compaction & concrete",
        items: ["Road Roller", "Plate Compactor", "Concrete Mixer", "Concrete Pump"],
      },
    ],
  },
  industrial: {
    title: "Industrial equipment",
    lead: "Pick the machine you need — matching listings will quote.",
    sections: [
      {
        heading: "1 · Power & generation",
        items: ["Generator", "Compressor", "Welding Plant"],
      },
      {
        heading: "2 · Material handling",
        items: ["Forklift", "Telehandler", "Pallet Jack"],
      },
      {
        heading: "3 · Site support",
        items: ["Lighting Tower", "Water Pump", "Scaffolding"],
      },
    ],
  },
};

export const SUBTYPES_BY_EQUIPMENT = {
  Tractor: [
    {
      label: "Sub-Compact",
      detail:
        "Under 25 HP — small homesteads, large lawns, and basic property landscaping.",
    },
    {
      label: "Compact",
      detail:
        "25–60 HP — mixed farming, heavy tilling, and light material handling.",
    },
    {
      label: "Heavy-Duty / High-Power",
      detail:
        "150–300+ HP — multi-row seeders and large disc ploughs across big acreage.",
    },
  ],
  Excavator: [
    { label: "Mini", detail: "Under 6t — tight sites and residential digs." },
    { label: "Midi", detail: "6–15t — general building and utilities." },
    { label: "Standard", detail: "15t+ — bulk earthworks and quarries." },
  ],
  Generator: [
    { label: "Portable", detail: "Under 20 kVA — events and small sites." },
    { label: "Site", detail: "20–100 kVA — construction power." },
    { label: "Industrial", detail: "100 kVA+ — continuous plant power." },
  ],
};

export const DEFAULT_SUBTYPES = [
  { label: "Standard", detail: "Typical size for this equipment class." },
  { label: "Heavy-Duty", detail: "Higher capacity / longer hire days." },
  { label: "Compact", detail: "Smaller footprint for confined sites." },
];

/** Normalize API hub → picker shape (items as name strings for tiles). */
export function normalizeHubCatalog(hub) {
  if (!hub) return null;
  return {
    hub_category: hub.hub_category,
    title: hub.title,
    lead: hub.lead || "",
    sections: (hub.sections || []).map((section) => ({
      heading: section.heading,
      items: (section.items || []).map((it) =>
        typeof it === "string" ? it : it.name
      ),
      itemDetails: (section.items || []).map((it) =>
        typeof it === "string"
          ? { name: it, subtypes: [] }
          : {
              name: it.name,
              slug: it.slug,
              subtypes: it.subtypes || [],
            }
      ),
    })),
    default_subtypes: hub.default_subtypes || DEFAULT_SUBTYPES,
  };
}

export function fallbackCatalogByHub() {
  const by_hub = {};
  for (const [key, cat] of Object.entries(EQUIPMENT_BY_CATEGORY)) {
    by_hub[key] = normalizeHubCatalog({
      hub_category: key,
      title: cat.title,
      lead: cat.lead,
      default_subtypes: DEFAULT_SUBTYPES,
      sections: cat.sections.map((s) => ({
        heading: s.heading,
        items: s.items.map((name) => ({
          name,
          subtypes: SUBTYPES_BY_EQUIPMENT[name] || DEFAULT_SUBTYPES,
        })),
      })),
    });
  }
  return by_hub;
}

export function getEquipmentCatalog(category, byHub) {
  const map = byHub || fallbackCatalogByHub();
  return map[category] || map.agricultural;
}

export function getSubtypesForEquipment(equipment, catalog) {
  if (catalog?.sections) {
    for (const section of catalog.sections) {
      const details = section.itemDetails || [];
      const hit = details.find(
        (d) => d.name?.toLowerCase() === String(equipment || "").toLowerCase()
      );
      if (hit?.subtypes?.length) return hit.subtypes;
    }
    if (catalog.default_subtypes?.length) return catalog.default_subtypes;
  }
  return SUBTYPES_BY_EQUIPMENT[equipment] || DEFAULT_SUBTYPES;
}

export function categoryLabel(category) {
  const map = {
    agricultural: "Agricultural",
    construction: "Construction",
    industrial: "Industrial",
  };
  return map[category] || "Equipment";
}
