import { useEffect, useMemo, useState } from "react";
import LogisticsMoneyInput from "../../CommanComponents/LogisticsMoneyInput";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LogisticsPlanBanner, {
  isPlanBucketFull,
  isPlanLimitError,
} from "../../CommanComponents/LogisticsPlanBanner";
import LogisticsPhoneInput, {
  DEFAULT_COUNTRY_CODE,
} from "../../CommanComponents/LogisticsPhoneInput";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import { buildPublicAssetUrl } from "../../utils/ImagePath";
import { logisticsSupplyNeedsSubscription } from "../../utils/chatAccess";
import { getActiveModule } from "../../utils/Roles";
import {
  messagesPath,
  persistReceiverId,
} from "../../utils/normalizeMongoId";
import "./logistics.css";
import {
  LogisticsListSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";
import LogisticsDateInput from "../../CommanComponents/LogisticsDateInput";
import { OPERATOR_COMPLIANCE_TYPES, docExpiryChip, fmtExpiry, REMINDER_HINT } from "../../utils/docExpiry";
import { LICENCE_CLASSES } from "../../utils/logisticsLicence";

const OPERATOR_DOCS = [
  {
    id: "licence",
    label: "Driving / plant licence",
    hint: "Tap to upload",
  },
  {
    id: "medical",
    label: "Medical fitness",
    hint: "Tap to upload",
  },
];

function inviteActivateUrl(token) {
  if (!token) return "";
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/logistics/invite?token=${encodeURIComponent(token)}`;
}

const INVITE_STATE = {
  invited: { label: "Invited", chip: "log-chip--pending" },
  opened: { label: "Opened", chip: "log-chip--progress" },
  expired: { label: "Expired", chip: "log-chip--closed" },
};

/** "Sent by email and SMS" from the backend's per-channel delivery results. */
function inviteDeliverySummary(delivery) {
  const rows = delivery || [];
  const sent = rows.filter((d) => d?.ok).map((d) =>
    d.channel === "sms" ? "SMS" : d.channel === "whatsapp" ? "WhatsApp" : "email"
  );
  if (!sent.length) return "";
  const list = sent.length === 1 ? sent[0] : `${sent.slice(0, -1).join(", ")} and ${sent[sent.length - 1]}`;
  // WhatsApp picked but unavailable → the server texted the link instead
  const fellBack = rows.some((d) => d?.fallback && d.ok);
  return fellBack ? `${list} (WhatsApp wasn't available, so the link went by SMS)` : list;
}

const INVITE_CHANNEL_OPTIONS = [
  { id: "email", label: "Email", hint: "Link to their login email" },
  { id: "whatsapp", label: "WhatsApp", hint: "Link to their phone (SMS if WhatsApp isn't available)" },
];

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const emptyInvite = () => ({
  full_name: "",
  email: "",
  country_code: DEFAULT_COUNTRY_CODE,
  phone_number: "",
  plant_licence_number: "",
  licence_class: "",
  pay_type: "percentage",
  pay_value: "20",
  profile_photo: null,
  profile_preview: null,
  docs: {},
  asset_ids: [],
  extra_docs: [],
  // v2.7.34: where the invite link goes
  send_via: ["email", "whatsapp"],
});

function publicUrl(path) {
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

/** "Driving / plant licence: expiry date is required" when a licence / medical has no expiry. */
function missingDocExpiry(docs) {
  const hit = Object.entries(docs || {}).find(
    ([type, entry]) =>
      OPERATOR_COMPLIANCE_TYPES.includes(type) && (entry?.file || entry?.url) && !entry?.expires
  );
  if (!hit) return "";
  const label = OPERATOR_DOCS.find((d) => d.id === hit[0])?.label || hit[0];
  return `${label}: expiry date is required`;
}

/** Operator list: expired / expiring licence + medical chips. */
function OperatorDocStatus({ compliance }) {
  if (!compliance) return null;
  const chips = [
    ...(compliance.expired || []).map((d) => ({ key: `x-${d.type}`, tone: "closed", text: `${d.label} expired` })),
    ...(compliance.expiring || []).map((d) => ({
      key: `e-${d.type}`,
      tone: "progress",
      text: d.status === "today" ? `${d.label} expires today` : `${d.label} expires in ${d.days_left} d`,
    })),
    ...(compliance.missing_expiry || []).map((d) => ({ key: `m-${d.type}`, tone: "muted", text: `${d.label}: no expiry set` })),
  ];
  if (!chips.length) return null;
  return (
    <span className="log-doc-status">
      {chips.map((c) => (
        <span key={c.key} className={`log-chip log-chip--${c.tone}`}>
          {c.text}
        </span>
      ))}
      {compliance.expired?.length ? (
        <span className="log-hint" style={{ margin: 0 }}>
          Can&apos;t go live or quote until renewed
        </span>
      ) : null}
    </span>
  );
}

function OperatorDocRows({ items, docs, onPick, onExpiry }) {
  return (
    <ul className="log-doc-list">
      {items.map((d) => {
        const entry = docs[d.id];
        const fileLabel =
          entry?.name || entry?.file?.name || (entry?.url ? "On file" : null);
        const existingHref = entry?.url ? publicUrl(entry.url) : null;
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
              <p>
                {fileLabel
                  ? `${fileLabel}${
                      entry?.expires ? ` · expires ${fmtExpiry(entry.expires)}` : ""
                    }`
                  : d.hint}
                {existingHref && !entry?.file ? (
                  <>
                    {" · "}
                    <a href={existingHref} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </>
                ) : null}
              </p>
            </span>
            {entry?.url || entry?.file ? (
              <span className={`log-chip log-chip--${docExpiryChip(entry?.expires).tone}`}>
                {docExpiryChip(entry?.expires).label}
              </span>
            ) : null}
            <label className="log-doc-row__expiry">
              <span>
                Expiry date
                {OPERATOR_COMPLIANCE_TYPES.includes(d.id) ? <span className="log-req"> *</span> : null}
              </span>
              <LogisticsDateInput
                pickerOnly
                value={entry?.expires || ""}
                onChange={(e) => onExpiry?.(d.id, e.target.value)}
                required={OPERATOR_COMPLIANCE_TYPES.includes(d.id) && Boolean(entry?.file || entry?.url)}
              />
              {(entry?.file || entry?.url) && !entry?.expires && OPERATOR_COMPLIANCE_TYPES.includes(d.id) ? (
                <span className="log-field-error">Expiry date is required</span>
              ) : null}
            </label>
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

export default function LogisticsOperators() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const showAddByRoute = /\/operators\/add\/?$/.test(location.pathname);

  const [operators, setOperators] = useState([]);
  const [invites, setInvites] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(showAddByRoute);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyInvite);
  // Plan + usage from the banner; operators bucket full → add form is locked
  const [planSub, setPlanSub] = useState(null);
  const [assetQuery, setAssetQuery] = useState("");
  const [q, setQ] = useState("");
  const [assignment, setAssignment] = useState("all");
  const [showKind, setShowKind] = useState("all");
  const [applied, setApplied] = useState({
    q: "",
    assignment: "all",
    showKind: "all",
  });

  const load = async () => {
    setLoading(true);
    const [subRes, assetRes] = await Promise.all([
      dispatch(LogisticsActions.listSubUsers()),
      dispatch(LogisticsActions.listAssets()),
    ]);
    const data = subRes?.payload?.data || {};
    setOperators(
      Array.isArray(data.operators)
        ? data.operators
        : Array.isArray(data.drivers)
          ? data.drivers
          : []
    );
    setInvites(Array.isArray(data.invites) ? data.invites : []);
    setAssets(assetRes?.payload?.data?.assets || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (showAddByRoute) {
      setEditingId(null);
      setShowForm(true);
    }
  }, [showAddByRoute]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyInvite());
    setShowForm(true);
    if (!showAddByRoute) {
      navigate("/logistics/owner/operators/add", { replace: true });
    }
  };

  const openEdit = (op) => {
    if (form.profile_preview) URL.revokeObjectURL(form.profile_preview);
    const docs = {};
    const extra_docs = [];
    (op.logistics_documents || []).forEach((doc, idx) => {
      const type = String(doc.type || "other");
      const id =
        type === "licence" || type === "medical" ? type : `other_${idx}_${type}`;
      if (id.startsWith("other_")) extra_docs.push(id);
      docs[id] = {
        name: doc.name || type,
        url: doc.url,
        expires: doc.expires
          ? new Date(doc.expires).toISOString().slice(0, 10)
          : "",
      };
      docs[id].orig_expires = docs[id].expires;
    });
    setEditingId(op._id);
    setForm({
      ...emptyInvite(),
      full_name: op.full_name || "",
      email: op.email || "",
      country_code: op.country_code || DEFAULT_COUNTRY_CODE,
      phone_number: op.phone_number || "",
      plant_licence_number: op.driving_licence_number || "",
      licence_class: op.licence_class || "",
      pay_type: op.invite_pay_type || "percentage",
      pay_value:
        op.invite_pay_value != null ? String(op.invite_pay_value) : "0",
      profile_preview: publicUrl(op.profile_image),
      docs,
      extra_docs,
    });
    setShowForm(true);
    if (showAddByRoute) {
      navigate("/logistics/owner/operators", { replace: true });
    }
  };

  const closeForm = () => {
    if (form.profile_preview && form.profile_photo) {
      URL.revokeObjectURL(form.profile_preview);
    }
    setForm(emptyInvite());
    setAssetQuery("");
    setEditingId(null);
    setShowForm(false);
    if (showAddByRoute) {
      navigate("/logistics/owner/operators", { replace: true });
    }
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setForm((f) => {
      if (f.profile_preview) URL.revokeObjectURL(f.profile_preview);
      return {
        ...f,
        profile_photo: file,
        profile_preview: URL.createObjectURL(file),
      };
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

  const onAddExtraDoc = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const id = `other_${Date.now()}`;
    setForm((f) => ({
      ...f,
      extra_docs: [...f.extra_docs, id],
      docs: {
        ...f.docs,
        [id]: { name: file.name, file, expires: "" },
      },
    }));
  };

  const toggleAsset = (asset) => {
    const sid = String(asset._id);
    const taken = (asset.assigned_count || asset.assigned_operators?.length || 0) > 0;
    const alreadyChecked = form.asset_ids.map(String).includes(sid);

    if (taken && !alreadyChecked) {
      const names = (asset.assigned_operators || [])
        .map((op) => op.full_name || op.email || "another operator")
        .join(", ");
      toast.error(
        `${asset.name || "This equipment"} is already assigned to ${names}. Manage operators from Fleet.`
      );
      return;
    }

    setForm((f) => {
      const setIds = new Set(f.asset_ids.map(String));
      if (setIds.has(sid)) setIds.delete(sid);
      else setIds.add(sid);
      return { ...f, asset_ids: [...setIds] };
    });
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (inviteLocked) {
      toast.error(
        "Your plan's operator limit is reached (pending invites count). Upgrade your plan or remove an operator / invite first."
      );
      return;
    }
    if (!String(form.email || "").trim()) {
      toast.error("Email is required");
      return;
    }
    if (missingDocExpiry(form.docs)) {
      toast.error(missingDocExpiry(form.docs));
      return;
    }
    // WhatsApp only counts once a phone number is entered
    const hasPhone = Boolean(String(form.phone_number || "").replace(/\D/g, ""));
    const sendVia = (form.send_via || []).filter((c) => c !== "whatsapp" || hasPhone);
    if (!sendVia.length) {
      toast.error(
        hasPhone
          ? "Choose how to send the invite link: Email and/or WhatsApp"
          : "Tick Email, or add a phone number to send the invite on WhatsApp"
      );
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("sub_user_type", "operator");
      fd.append("full_name", String(form.full_name || "").trim());
      fd.append("email", String(form.email || "").trim().toLowerCase());
      const phone = String(form.phone_number || "").replace(/\D/g, "");
      fd.append("phone_number", phone);
      if (phone) fd.append("country_code", form.country_code || DEFAULT_COUNTRY_CODE);
      fd.append(
        "driving_licence_number",
        String(form.plant_licence_number || "").trim()
      );
      fd.append("plant_licence_number", String(form.plant_licence_number || "").trim());
      if (form.licence_class) fd.append("licence_class", form.licence_class);
      fd.append("send_via", JSON.stringify(sendVia));
      fd.append("pay_type", form.pay_type || "percentage");
      fd.append("pay_value", form.pay_value || "0");
      const freeIds = form.asset_ids.filter((id) => {
        const asset = assets.find((a) => String(a._id) === String(id));
        if (!asset) return false;
        return !(asset.assigned_count || asset.assigned_operators?.length);
      });
      if (form.asset_ids.length && freeIds.length !== form.asset_ids.length) {
        toast.error(
          "Some selected equipment is already assigned. Uncheck those or manage from Fleet."
        );
        setSaving(false);
        return;
      }
      fd.append("asset_ids", JSON.stringify(freeIds));
      if (form.profile_photo) fd.append("profile_photo", form.profile_photo);

      const docTypes = [];
      const docExpires = [];
      const docNames = [];
      Object.entries(form.docs || {}).forEach(([type, entry]) => {
        if (!entry?.file) return;
        fd.append("documents", entry.file);
        docTypes.push(type.startsWith("other_") ? "other" : type);
        docExpires.push(entry.expires || "");
        docNames.push(entry.name || entry.file.name || type);
      });
      if (docTypes.length) {
        fd.append("document_types", JSON.stringify(docTypes));
        fd.append("document_expires", JSON.stringify(docExpires));
        fd.append("document_names", JSON.stringify(docNames));
      }

      const res = await dispatch(LogisticsActions.createSubUser(fd));
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        const sentBy = inviteDeliverySummary(res?.payload?.data?.invite?.delivery);
        toast.success(
          sentBy
            ? `Invite sent by ${sentBy}. You can also copy the link from Pending invites.`
            : "Invite created, but it couldn't be sent — copy the link from Pending invites and share it."
        );
        closeForm();
        await load();
      } else {
        if (isPlanLimitError(res?.payload)) {
          toast.error(`${res.payload.message} Tap to see plans.`, {
            onClick: () => navigate("/logistics/owner/subscription"),
          });
        } else {
          toast.error(res?.payload?.message || "Could not invite");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const saveOperatorEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    if (missingDocExpiry(form.docs)) {
      toast.error(missingDocExpiry(form.docs));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("full_name", String(form.full_name || "").trim());
      fd.append("pay_type", form.pay_type || "percentage");
      fd.append("pay_value", form.pay_value || "0");
      fd.append("driving_licence_number", String(form.plant_licence_number || "").trim());
      fd.append("licence_class", form.licence_class || "");
      if (form.profile_photo) fd.append("profile_photo", form.profile_photo);
      // Expiry changed on a document already on file (no new upload)
      const expiryUpdates = Object.entries(form.docs || {})
        .filter(([, entry]) => entry?.url && !entry?.file && (entry.expires || "") !== (entry.orig_expires || ""))
        .map(([type, entry]) => ({ type: type.startsWith("other_") ? "other" : type, expires: entry.expires || "" }));
      if (expiryUpdates.length) fd.append("document_expiry_updates", JSON.stringify(expiryUpdates));

      const docTypes = [];
      const docExpires = [];
      const docNames = [];
      Object.entries(form.docs || {}).forEach(([type, entry]) => {
        if (!entry?.file) return;
        fd.append("documents", entry.file);
        docTypes.push(type.startsWith("other_") ? "other" : type);
        docExpires.push(entry.expires || "");
        docNames.push(entry.name || entry.file.name || type);
      });
      if (docTypes.length) {
        fd.append("document_types", JSON.stringify(docTypes));
        fd.append("document_expires", JSON.stringify(docExpires));
        fd.append("document_names", JSON.stringify(docNames));
      }

      const res = await dispatch(
        LogisticsActions.patchSubUser({ id: editingId, formData: fd })
      );
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Operator updated — they were notified");
        closeForm();
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not update");
      }
    } finally {
      setSaving(false);
    }
  };

  const resend = async (id) => {
    setSaving(true);
    try {
      const res = await dispatch(LogisticsActions.resendSubUserInvite(id));
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        const sentBy = inviteDeliverySummary(res?.payload?.data?.invite?.delivery);
        toast.success(
          sentBy
            ? `Invite resent by ${sentBy} — valid for 7 more days`
            : "New link created, but it couldn't be sent — use Copy link and share it"
        );
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not resend");
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelInvite = async (inv) => {
    if (
      !window.confirm(
        `Cancel the invite for ${inv.full_name || inv.email}? The link will stop working.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(LogisticsActions.cancelInvite(inv._id));
      if (res?.meta?.requestStatus === "fulfilled" && res?.payload?.success) {
        toast.success("Invite cancelled");
        await load();
      } else {
        toast.error(res?.payload?.message || "Could not cancel");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id, name) => {
    if (
      !window.confirm(
        `Remove ${name || "this operator"}? They will lose access to assigned equipment.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(LogisticsActions.deleteSubUser(id));
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

  const empty = !loading && !operators.length && !invites.length;
  const isEditing = Boolean(editingId);
  // Free plan with every operator slot used (incl. pending invites) → no new invites
  const inviteLocked = !isEditing && isPlanBucketFull(planSub, "operators");
  const assetMatches = useMemo(() => {
    const needle = assetQuery.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((a) =>
      [a.name, a.registration, a.model, a.make]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }, [assets, assetQuery]);

  const hasFilters = Boolean(
    applied.q ||
      applied.assignment !== "all" ||
      applied.showKind !== "all"
  );

  const filteredOperators = useMemo(() => {
    if (applied.showKind === "pending") return [];
    const needle = applied.q.toLowerCase();
    return operators.filter((op) => {
      const assigned = op.assigned_assets || [];
      if (applied.assignment === "assigned" && !assigned.length) return false;
      if (applied.assignment === "unassigned" && assigned.length) return false;
      if (!needle) return true;
      const hay = [
        op.full_name,
        op.email,
        op.phone_number,
        ...assigned.map((a) => a.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [operators, applied]);

  const filteredInvites = useMemo(() => {
    if (applied.showKind === "active") return [];
    if (applied.assignment === "assigned") return [];
    const needle = applied.q.toLowerCase();
    return invites.filter((inv) => {
      if (!needle) return true;
      const hay = [inv.full_name, inv.email, inv.phone_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [invites, applied]);

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      q: q.trim(),
      assignment,
      showKind,
    });
  };

  const clearFilters = () => {
    setQ("");
    setAssignment("all");
    setShowKind("all");
    setApplied({ q: "", assignment: "all", showKind: "all" });
  };

  const messageOperator = async (op) => {
    try {
      const me = await dispatch(LogisticsActions.getMe());
      const user = me?.payload?.data?.user || {};
      if (
        logisticsSupplyNeedsSubscription({
          role: user.role,
          isSubscribed: user.isSubscribed,
          activeModule: getActiveModule(),
        })
      ) {
        toast.info(
          "An active fleet subscription is required to message operators"
        );
        return;
      }
    } catch {
      /* MainChat still gates */
    }
    persistReceiverId(op._id);
    try {
      sessionStorage.setItem(
        "chatPeerHint",
        JSON.stringify({
          _id: String(op._id),
          full_name: op.full_name || "Operator",
        })
      );
    } catch {
      /* ignore */
    }
    navigate(messagesPath(op._id));
  };
  const pageTitle = showForm
    ? isEditing
      ? "Edit Operator"
      : "Add Operator"
    : "Operators";
  const docItems = useMemo(() => {
    const extras = (form.extra_docs || []).map((id) => ({
      id,
      label: form.docs[id]?.name || "Extra document",
      hint: "Uploaded",
    }));
    return [...OPERATOR_DOCS, ...extras];
  }, [form.extra_docs, form.docs]);

  return (
    <LogisticsPageShell
      title={pageTitle}
      crumbLabel={pageTitle}
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <LogisticsPlanBanner
        buckets={["operators"]}
        refreshKey={operators.length + invites.length}
        onLoaded={setPlanSub}
      />
      {showForm ? (
        <form
          className="log-form-card"
          onSubmit={isEditing ? saveOperatorEdit : sendInvite}
        >
          {inviteLocked ? (
            <div className="log-plan-limit-lock" role="alert">
              <b>
                Operator limit reached ({planSub.usage?.operators ?? 0} /{" "}
                {planSub.plan?.limits?.operators}) on your {planSub.plan?.name} plan.
              </b>
              <span>
                Unexpired pending invites count too. Upgrade your plan, or remove an
                operator or cancel a pending invite to add a new one.
              </span>
              <Link
                className="logistics-cta logistics-cta--primary"
                to="/logistics/owner/subscription"
              >
                See plans
              </Link>
            </div>
          ) : null}
          <fieldset className="log-form-fieldset" disabled={inviteLocked}>
          <p className="log-hint" style={{ marginTop: 0 }}>
            {isEditing
              ? "Update name, photo, documents, and pay type only. The operator is notified of each change."
              : "We send the invite by email and SMS with a link. The operator opens it, sets a password and lands on their dashboard. Assign units now or later — they become active when the invite is accepted."}
          </p>

          <div className="log-field log-field--full">
            <span className="log-fl">Profile photo</span>
            <div className="log-photo-slots">
              {form.profile_preview ? (
                <div className="log-photo-slot log-photo-slot--filled">
                  <img src={form.profile_preview} alt="Operator" />
                  <button
                    type="button"
                    className="log-photo-slot__remove"
                    aria-label="Remove photo"
                    onClick={() =>
                      setForm((f) => {
                        if (f.profile_preview && f.profile_photo) {
                          URL.revokeObjectURL(f.profile_preview);
                        }
                        return {
                          ...f,
                          profile_photo: null,
                          profile_preview: null,
                        };
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <label className="log-photo-slot log-photo-slot--add">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onPickPhoto}
                />
                <span className="log-photo-slot__plus">+</span>
                <span className="log-photo-slot__label">
                  {form.profile_preview ? "Replace" : "Add"}
                </span>
              </label>
            </div>
          </div>

          <div className="log-form-grid">
            <label className="log-field">
              <span className="log-fl">Full name</span>
              <input
                value={form.full_name}
                onChange={set("full_name")}
                placeholder="Tendai Moyo"
              />
            </label>
            {!isEditing ? (
              <>
                <label className="log-field">
                  <span className="log-fl">
                    Email <span className="log-req">*</span>
                  </span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="t.moyo@gmail.com"
                    required
                  />
                </label>
                <div className="log-field">
                  <label className="log-fl" htmlFor="op-phone">
                    Phone
                  </label>
                  <LogisticsPhoneInput
                    id="op-phone"
                    countryCode={form.country_code}
                    phoneNumber={form.phone_number}
                    disabled={inviteLocked}
                    onChange={({ country_code, phone_number }) =>
                      setForm((f) => ({ ...f, country_code, phone_number }))
                    }
                  />
                </div>
              </>
            ) : null}
            <label className="log-field">
              <span className="log-fl">Plant licence / Driving Licence</span>
              <input
                value={form.plant_licence_number}
                onChange={set("plant_licence_number")}
                placeholder="Licence number"
              />
            </label>
            <label className="log-field">
              <span className="log-fl">Licence class</span>
              <select value={form.licence_class} onChange={set("licence_class")}>
                <option value="">Select class…</option>
                {[...new Set([...LICENCE_CLASSES, form.licence_class].filter(Boolean))].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="log-field">
              <span className="log-fl">Pay type</span>
              <select value={form.pay_type} onChange={set("pay_type")}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed per job</option>
                <option value="monthly">Monthly fixed (salary)</option>
                <option value="none">None</option>
              </select>
            </label>
            {form.pay_type !== "none" && form.pay_type !== "monthly" ? (
              <label className="log-field">
                <span className="log-fl">
                  {form.pay_type === "fixed" ? "Pay amount" : "Pay %"}
                </span>
                {form.pay_type === "fixed" ? (
                  <LogisticsMoneyInput
                    value={form.pay_value}
                    onChange={(v) => setForm((f) => ({ ...f, pay_value: v }))}
                    aria-label="Pay amount"
                  />
                ) : (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={form.pay_value}
                    onChange={set("pay_value")}
                  />
                )}
              </label>
            ) : null}
            {form.pay_type === "monthly" ? (
              <p className="log-hint" style={{ margin: 0 }}>
                Monthly salary is handled off-platform. Job earnings for this
                operator stay at 0; the owner keeps the full job amount.
              </p>
            ) : null}
          </div>

          <p className="log-sect log-field--full" style={{ marginBottom: 0 }}>
            Operator documents{" "}
            <span className="log-sect__soft">(as required)</span>
          </p>
          <p className="log-hint log-field--full">
            Licence scan, medical fitness and any other papers for this
            operator. Licence and medical need an expiry date (*). {REMINDER_HINT}{" "}
            With an expired licence or medical the operator can&apos;t go live or quote.
          </p>
          <div className="log-field--full">
            <OperatorDocRows
              items={docItems}
              docs={form.docs}
              onPick={onPickDoc}
              onExpiry={onDocExpiry}
            />
            <label
              className="log-photo-slot log-photo-slot--add"
              style={{ marginTop: 10, width: 88, height: 72 }}
            >
              <input
                type="file"
                accept=".pdf,image/*"
                hidden
                onChange={onAddExtraDoc}
              />
              <span className="log-photo-slot__plus">+</span>
              <span className="log-photo-slot__label">Add doc</span>
            </label>
          </div>

          {!isEditing ? (
            <div className="log-field log-field--full" style={{ marginTop: 16 }}>
              <span className="log-fl">
                Assign to equipment{" "}
                <span className="log-sect__soft">(optional)</span>
              </span>
              <p className="log-hint" style={{ margin: "4px 0 8px" }}>
                Skip for now if you prefer — assign later from{" "}
                <Link to="/logistics/owner/fleet">Fleet</Link>.
              </p>
              {assets.length ? (
                <>
                <div className="log-asset-pick__search">
                  <input
                    type="search"
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder="Search by name or registration no."
                    aria-label="Search equipment by name or registration number"
                  />
                  <small>
                    {form.asset_ids.length
                      ? `${form.asset_ids.length} selected · `
                      : ""}
                    {assetMatches.length} of {assets.length}
                  </small>
                </div>
                {assetMatches.length ? (
                <ul className="log-doc-list log-asset-pick__list">
                  {assetMatches.map((a) => {
                    const checked = form.asset_ids
                      .map(String)
                      .includes(String(a._id));
                    const ops = a.assigned_operators || [];
                    const taken = (a.assigned_count || ops.length) > 0;
                    const opLabel = ops
                      .map((op) => op.full_name || op.email || "Operator")
                      .join(", ");
                    return (
                      <li
                        key={a._id}
                        className={`log-doc-row${
                          taken ? " log-doc-row--blocked" : ""
                        }`}
                      >
                        <label
                          className="log-check"
                          style={{ margin: 0, flex: 1 }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={taken && !checked}
                            onChange={() => toggleAsset(a)}
                          />
                          <span>
                            <b>
                              {a.name}
                              {a.registration ? ` · ${a.registration}` : ""}
                            </b>
                            {taken ? (
                              <p
                                className="log-field-error"
                                style={{ margin: "2px 0 0" }}
                              >
                                Already assigned to {opLabel}. Open equipment to
                                change.
                              </p>
                            ) : (
                              <p style={{ margin: "2px 0 0" }}>Available</p>
                            )}
                          </span>
                        </label>
                        {taken ? (
                          <Link
                            className="logistics-cta logistics-cta--ghost"
                            to={`/logistics/owner/fleet/${a._id}`}
                          >
                            Manage
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                ) : (
                  <p className="log-hint log-asset-pick__empty">
                    No equipment matches “{assetQuery.trim()}”.
                  </p>
                )}
                </>
              ) : (
                <p className="log-hint">
                  No fleet yet —{" "}
                  <Link to="/logistics/owner/fleet/add">add equipment</Link>{" "}
                  first, or invite now and assign later.
                </p>
              )}
            </div>
          ) : null}

          {!isEditing ? (
            <div className="log-field log-field--full log-invite-via">
              <span className="log-fl">Send invite link via *</span>
              <div className="log-invite-via__opts" role="group" aria-label="Send invite link via">
                {INVITE_CHANNEL_OPTIONS.map((c) => {
                  const noPhone =
                    c.id === "whatsapp" && !String(form.phone_number || "").replace(/\D/g, "");
                  const on = !noPhone && (form.send_via || []).includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`log-invite-via__opt${on ? " is-on" : ""}${noPhone ? " is-unavailable" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={noPhone}
                        onChange={() =>
                          setForm((f) => {
                            const cur = f.send_via || [];
                            return {
                              ...f,
                              send_via: cur.includes(c.id) ? cur.filter((x) => x !== c.id) : [...cur, c.id],
                            };
                          })
                        }
                      />
                      <span>
                        <b>{c.label}</b>
                        <small>{noPhone ? "Add a phone number first" : c.hint}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
              {!(form.send_via || []).filter(
                (c) => c !== "whatsapp" || String(form.phone_number || "").replace(/\D/g, "")
              ).length ? (
                <span className="log-hint log-hint--warn">Pick at least one.</span>
              ) : null}
            </div>
          ) : null}

          </fieldset>

          <div
            className="log-form-actions log-field--full"
            style={{ justifyContent: "flex-start", marginTop: 16 }}
          >
            <button
              type="submit"
              className="logistics-cta logistics-cta--primary"
              disabled={saving || inviteLocked}
            >
              {saving
                ? isEditing
                  ? "Saving…"
                  : "Sending…"
                : isEditing
                  ? "Save changes"
                  : "Send invite"}
            </button>
            <button
              type="button"
              className="logistics-cta logistics-cta--ghost"
              onClick={closeForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <form
            className="log-jobs-toolbar log-jobs-toolbar--wrap"
            onSubmit={applyFilters}
          >
            <label className="log-jobs-toolbar__search">
              <span className="log-fl">Search</span>
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, email, phone, asset…"
                aria-label="Search operators"
              />
            </label>
            <label>
              <span className="log-fl">Show</span>
              <select
                value={showKind}
                onChange={(e) => setShowKind(e.target.value)}
                aria-label="Show active or invites"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="pending">Pending invites</option>
              </select>
            </label>
            <label>
              <span className="log-fl">Assignment</span>
              <select
                value={assignment}
                onChange={(e) => setAssignment(e.target.value)}
                aria-label="Filter by assignment"
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
            <div className="log-jobs-toolbar__actions">
              <button
                type="submit"
                className="logistics-cta logistics-cta--primary"
              >
                Apply
              </button>
              {hasFilters || q || assignment !== "all" || showKind !== "all" ? (
                <button
                  type="button"
                  className="logistics-cta logistics-cta--ghost"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                className="logistics-cta logistics-cta--primary"
                onClick={openAdd}
              >
                Add operator
              </button>
            </div>
          </form>

          {loading ? (
            <LogisticsListSkeleton rows={4} label="Loading operators" />
          ) : empty ? (
            <div className="log-form-card">
              <p className="log-sect" style={{ marginTop: 0 }}>
                No operators yet
              </p>
              <p className="log-hint">
                Create an operator account and assign them to one or more assets.
              </p>
              <button
                type="button"
                className="logistics-cta logistics-cta--primary"
                onClick={openAdd}
              >
                Add your first operator
              </button>
            </div>
          ) : (
            <>
              <div className="log-jobs-meta">
                {hasFilters
                  ? `Showing ${filteredOperators.length} operator${
                      filteredOperators.length === 1 ? "" : "s"
                    }${
                      filteredInvites.length
                        ? ` · ${filteredInvites.length} invite${
                            filteredInvites.length === 1 ? "" : "s"
                          }`
                        : ""
                    }`
                  : `Active (${operators.length})${
                      invites.length
                        ? ` · Pending invites (${invites.length})`
                        : ""
                    }`}
              </div>

              {filteredOperators.length ? (
                <div className="log-jobs-table-wrap">
                  <table className="log-jobs-table">
                    <thead>
                      <tr>
                        <th>Operator</th>
                        <th>Assets</th>
                        <th>Status</th>
                        <th>Contact</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOperators.map((op) => {
                        const assigned = op.assigned_assets || [];
                        const photo = publicUrl(op.profile_image);
                        return (
                          <tr key={op._id}>
                            <td>
                              <div className="log-op-table-user">
                                {photo ? (
                                  <img
                                    className="log-op-avatar"
                                    src={photo}
                                    alt=""
                                  />
                                ) : (
                                  <span className="log-op-avatar log-op-avatar--initials">
                                    {(op.full_name || op.email || "O")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                                <span className="log-op-table-user__text">
                                  <b>{op.full_name || op.email || "Operator"}</b>
                                  {op.email ? (
                                    <span className="log-hint">{op.email}</span>
                                  ) : null}
                                </span>
                              </div>
                            </td>
                            <td>
                              {assigned.length
                                ? `${assigned.length} · ${assigned
                                    .map((a) => a.name)
                                    .join(" · ")}`
                                : "No equipment assigned"}
                            </td>
                            <td>
                              <span className="log-chip log-chip--active">
                                Active
                              </span>
                              <OperatorDocStatus compliance={op.document_compliance} />
                            </td>
                            <td>
                              <div className="log-op-contact">
                                <button
                                  type="button"
                                  className="log-op-contact__btn"
                                  title="Message"
                                  aria-label={`Message ${
                                    op.full_name || "operator"
                                  }`}
                                  onClick={() => messageOperator(op)}
                                >
                                  <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    aria-hidden="true"
                                  >
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                                  </svg>
                                </button>
                                {op.phone_number ? (
                                  <a
                                    className="log-op-contact__btn"
                                    href={`tel:${
                                      op.country_code
                                        ? `${op.country_code}${op.phone_number}`
                                        : op.phone_number
                                    }`}
                                    title="Call"
                                    aria-label={`Call ${
                                      op.full_name || "operator"
                                    }`}
                                  >
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      aria-hidden="true"
                                    >
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.25a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92Z" />
                                    </svg>
                                  </a>
                                ) : (
                                  <span
                                    className="log-op-contact__btn is-disabled"
                                    title="No phone on file"
                                    aria-disabled="true"
                                  >
                                    <svg
                                      width="18"
                                      height="18"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      aria-hidden="true"
                                    >
                                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.25a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92Z" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="log-op-table-actions">
                                <button
                                  type="button"
                                  className="logistics-cta logistics-cta--ghost"
                                  onClick={() => openEdit(op)}
                                >
                                  Edit
                                </button>
                                <Link
                                  className="logistics-cta logistics-cta--ghost"
                                  to="/logistics/owner/fleet"
                                >
                                  Assign
                                </Link>
                                <button
                                  type="button"
                                  className="logistics-cta logistics-cta--ghost"
                                  disabled={saving}
                                  onClick={() =>
                                    remove(op._id, op.full_name || op.email)
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {!filteredOperators.length &&
              !filteredInvites.length &&
              hasFilters ? (
                <p className="logistics-empty">
                  No operators match these filters
                </p>
              ) : null}

              {filteredInvites.length ? (
                <div className="log-jobs-table-wrap">
                  <table className="log-jobs-table">
                    <thead>
                      <tr>
                        <th>Pending invite</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvites.map((inv) => {
                        const link = inviteActivateUrl(inv.token);
                        const state =
                          INVITE_STATE[inv.invite_state] || INVITE_STATE.invited;
                        const expired = inv.invite_state === "expired";
                        return (
                          <tr key={inv._id}>
                            <td>
                              <b>{inv.full_name || inv.email}</b>
                              <p className="log-hint" style={{ margin: 0 }}>
                                {inv.email}
                                {inv.phone_number
                                  ? ` · ${inv.country_code || ""} ${inv.phone_number}`
                                  : ""}
                              </p>
                            </td>
                            <td>
                              <span className={`log-chip ${state.chip}`}>
                                {state.label}
                              </span>
                              {inv.last_sent_at ? (
                                <p className="log-hint" style={{ margin: "4px 0 0" }}>
                                  Sent {new Date(inv.last_sent_at).toLocaleDateString()}
                                </p>
                              ) : null}
                            </td>
                            <td>
                              {inv.expires_at
                                ? new Date(inv.expires_at).toLocaleDateString()
                                : "—"}
                              {expired ? (
                                <p className="log-hint" style={{ margin: "4px 0 0" }}>
                                  Resend to give them a new 7-day link
                                </p>
                              ) : null}
                            </td>
                            <td>
                              <div className="log-op-table-actions">
                                {link ? (
                                  <button
                                    type="button"
                                    className="logistics-cta logistics-cta--ghost"
                                    onClick={async () => {
                                      const ok = await copyText(link);
                                      toast.success(
                                        ok
                                          ? "Invite link copied"
                                          : "Could not copy"
                                      );
                                    }}
                                  >
                                    Copy link
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="logistics-cta logistics-cta--ghost"
                                  disabled={saving}
                                  onClick={() => resend(inv._id)}
                                >
                                  Resend
                                </button>
                                <button
                                  type="button"
                                  className="logistics-cta logistics-cta--ghost"
                                  disabled={saving}
                                  onClick={() => cancelInvite(inv)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </LogisticsPageShell>
  );
}
