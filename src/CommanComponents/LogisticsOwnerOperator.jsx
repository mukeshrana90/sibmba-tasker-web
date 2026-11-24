import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import {
  refreshLogisticsAccount,
  useLogisticsAccount,
} from "./LogisticsAccountBanner";
import LogisticsOperatorDocRows, { publicUrl } from "./LogisticsOperatorDocRows";
import LogisticsFacePhotoField from "./LogisticsFacePhotoField";
import useDocDeepLink from "../Hooks/useDocDeepLink";
import { readDeviceGps } from "../utils/deviceGps";
import { docReviewChip } from "../utils/docExpiry";
import {
  apiErrorCode,
  apiErrorMessage,
  isApiFailure,
  isFleetOwnerUser,
  occupancyLabel,
  unitOccupancy,
} from "../utils/ownerOperator";
import "../Pages/logistics/logistics.css";

const LICENCE_ROW = [{ id: "licence", label: "Driving / plant licence", hint: "Tap to upload" }];
const dateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

/**
 * One line on what is still needed, from the server's blocks (12 Nov 2026: the client
 * read every block as "face photo rejected"). Uploaded and only waiting → says so.
 */
export function ownerOperatorStatusText(op) {
  const blocks = op?.blocks || [];
  if (!blocks.length) return "";
  const codes = blocks.map((b) => String(b.code || ""));
  const toUpload = codes.filter((c) => /_(MISSING|REJECTED|EXPIRED)$/.test(c) || c === "NOT_ENABLED");
  if (!toUpload.length && codes.every((c) => /_PENDING$/.test(c) || c === "COMPANY_NOT_APPROVED")) {
    return "Everything is uploaded. Simba Tasker is checking it — you can go live once it's verified.";
  }
  return "To go live yourself you need a verified face photo, owner ID and driving / plant licence. Still to do:";
}

/** The signed-in owner's operator state (null until /me reports it). */
export function useOwnerOperator() {
  return useLogisticsAccount()?.owner_operator || null;
}

/** True while the signed-in owner is using this unit himself (same rule as UnitOperateControl). */
export function useOwnerOnUnit(asset) {
  const op = useOwnerOperator();
  if (!asset) return false;
  return (
    unitOccupancy(asset).by === "owner" ||
    Boolean(op?.active_asset_id && String(op.active_asset_id) === String(asset._id))
  );
}

/**
 * One-time face photo (and optional licence) for an owner who wants to operate units.
 * After the first upload either file can be replaced alone, and it goes back
 * to Pending check.
 */
export function OwnerOperatorSetup({ onSaved }) {
  const dispatch = useDispatch();
  const op = useOwnerOperator();
  const [licence, setLicence] = useState(null);
  const [expires, setExpires] = useState("");
  const [face, setFace] = useState(null);
  const [facePreview, setFacePreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setExpires((e) => e || dateInput(op?.licence?.expires));
  }, [op?.licence?.expires]);
  useEffect(
    () => () => {
      if (facePreview) URL.revokeObjectURL(facePreview);
    },
    [facePreview]
  );

  const hasLicence = Boolean(op?.licence?.url);
  // A driving licence kept as an owner ID is enough: don't ask for it twice
  const licenceFromOwnerId = op?.licence?.source === "owner_id" && op?.licence?.status !== "rejected";
  const hasFace = Boolean(op?.face_photo?.url);
  const licenceChip = docReviewChip({ status: op?.licence?.status, reason: op?.licence?.reason });
  const faceChip = docReviewChip({ status: op?.face_photo?.status, reason: op?.face_photo?.reason });

  // 12 Nov 2026: the licence is compulsory (a driving licence owner ID counts)
  const licenceNeeded = Boolean(op?.licence?.needs_upload) && !licenceFromOwnerId;

  const save = async () => {
    if (!licence && !face) {
      toast.error(hasFace ? "Upload your driving / plant licence" : "Take your face photo first");
      return;
    }
    if (!hasFace && !face) {
      toast.error("Add a clear photo of your face");
      return;
    }
    if (licenceNeeded && !licence) {
      toast.error("Upload your driving / plant licence too — it's required to go live");
      return;
    }
    if (licence && !expires) {
      toast.error("Driving / plant licence: expiry date is required");
      return;
    }
    const fd = new FormData();
    if (licence) {
      fd.append("doc_licence", licence);
      fd.append("doc_licence_expires", expires);
    }
    if (face) fd.append("face_photo", face);
    setSaving(true);
    try {
      const res = await dispatch(LogisticsActions.enableOwnerOperator(fd));
      if (isApiFailure(res)) {
        toast.error(apiErrorMessage(res?.payload, "Could not save your documents"));
        return;
      }
      toast.success("Saved — Simba Tasker will check your documents");
      setLicence(null);
      setFace(null);
      setFacePreview("");
      const fresh = await refreshLogisticsAccount();
      onSaved?.(fresh?.owner_operator || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="log-owner-op-setup" data-testid="owner-operator-setup">
      {op?.blocks?.length ? <p className="log-hint log-owner-op-setup__status">{ownerOperatorStatusText(op)}</p> : null}
      {op?.blocks?.length ? (
        <ul className="log-owner-op-setup__blocks" data-testid="owner-operator-blocks">
          {op.blocks.map((b) => (
            <li key={b.code || b.message}>{b.message}</li>
          ))}
        </ul>
      ) : null}
      <LogisticsFacePhotoField
        preview={facePreview || publicUrl(op?.face_photo?.url) || ""}
        canRemove={Boolean(face)}
        onCapture={(f) => {
          setFace(f);
          setFacePreview(URL.createObjectURL(f));
        }}
        onRemove={() => {
          setFace(null);
          setFacePreview("");
        }}
        label="Your face photo"
        required={!hasFace}
        hint="Customers see who is coming once a job is accepted."
      />
      {faceChip ? (
        <span className={`log-chip log-chip--${faceChip.tone} log-doc-review`} data-testid="owner-face-status" data-review={op.face_photo.status}>
          Face photo: {faceChip.label}
        </span>
      ) : null}
      {licenceFromOwnerId ? (
        <p className="log-hint" data-testid="owner-licence-from-id">
          We&apos;ll use the driving licence you added as your owner ID{op.licence.status === "verified" ? "." : ". Simba Tasker is checking it."}
        </p>
      ) : (
      <LogisticsOperatorDocRows
        items={LICENCE_ROW}
        docs={{
          licence: {
            url: licence ? null : op?.licence?.url || null,
            name: licence?.name || (op?.licence?.url ? "Your licence" : null),
            file: licence,
            expires,
            review: op?.licence?.status
              ? { status: op.licence.status, reason: op.licence.reason }
              : null,
          },
        }}
        onPick={(_id, f) => setLicence(f)}
        onExpiry={(_id, v) => setExpires(v)}
      />
      )}
      {licenceChip && op?.licence?.status === "rejected" ? (
        <p className="log-field-error">Upload a new licence so Simba Tasker can check it again.</p>
      ) : null}
      <button
        type="button"
        className="logistics-cta logistics-cta--primary log-owner-op-setup__save"
        data-testid="owner-operator-save"
        disabled={saving || (!licence && !face)}
        onClick={save}
      >
        {saving ? "Saving…" : licenceFromOwnerId && !hasFace ? "Save photo" : hasLicence || hasFace ? "Save changes" : "Save photo and licence"}
      </button>
    </div>
  );
}

/** Availability: the owner's own face photo and optional licence, once they have started operating. */
export function OwnerOperatorCard() {
  const op = useOwnerOperator();
  useDocDeepLink();
  if (!isFleetOwnerUser() || !op?.enabled) return null;
  return (
    <section className="log-form-card log-owner-op-card" data-testid="owner-operator-card" data-doc-anchor="face_photo">
      <h2 className="log-sect" style={{ marginTop: 0 }}>Operating units yourself</h2>
      {op.can_operate ? (
        <p className="log-hint" data-testid="owner-operator-ready">
          Your face photo, owner ID and licence are verified. Use a free unit below, or{" "}
          <Link to="/logistics/driver">open your operator dashboard</Link>.
        </p>
      ) : (
        <p className="log-hint">You can go live after Simba Tasker verifies your face photo, owner ID and driving / plant licence.</p>
      )}
      <OwnerOperatorSetup />
    </section>
  );
}

/** Add unit: "Who operates this?" */
/**
 * `simple` (Add screen): only "I operate it myself" shows (the client's recommended default);
 * the other choices open from a small link, so the form stays short.
 */
export function WhoOperatesField({ value, onChange, simple = false }) {
  const op = useOwnerOperator();
  const self = value === "self";
  const [showAll, setShowAll] = useState(!simple);
  const allOptions = showAll || !self;
  return (
    <div className="log-field log-field--full log-who-operates" data-field="operated_by">
      <span className="log-fl">Who operates this?</span>
      <div className="log-who-operates__options" role="radiogroup" aria-label="Who operates this?">
        <label className={`log-who-operates__opt${self ? " is-selected" : ""}`} data-testid="operated-by-self">
          <input type="radio" name="operated_by" value="self" checked={self} onChange={() => onChange("self")} />
          <span>
            <b>I operate it myself</b>
            <small>You go live on it and run its jobs.</small>
          </span>
        </label>
        {allOptions ? (
          <>
        <label className={`log-who-operates__opt${value === "invite" ? " is-selected" : ""}`} data-testid="operated-by-invite">
          <input type="radio" name="operated_by" value="invite" checked={value === "invite"} onChange={() => onChange("invite")} />
          <span>
            <b>Invite a new operator</b>
            <small>Add them here. Simba Tasker checks them with this unit.</small>
          </span>
        </label>
        <label className={`log-who-operates__opt${value === "existing" ? " is-selected" : ""}`} data-testid="operated-by-existing">
          <input type="radio" name="operated_by" value="existing" checked={value === "existing"} onChange={() => onChange("existing")} />
          <span>
            <b>One of my operators</b>
            <small>Pick someone you've already added.</small>
          </span>
        </label>
        <label className={`log-who-operates__opt${value === "later" ? " is-selected" : ""}`} data-testid="operated-by-later">
          <input type="radio" name="operated_by" value="later" checked={value === "later"} onChange={() => onChange("later")} />
          <span>
            <b>Decide later</b>
            <small>The unit stays hidden from customers until someone is assigned.</small>
          </span>
        </label>
          </>
        ) : null}
      </div>
      {self ? (
        op?.can_operate ? (
          <p className="log-hint" data-testid="owner-operator-ready">Your face photo, owner ID and licence are verified. You can go live on this unit once it is saved.</p>
        ) : (
          <>
            <p className="log-hint">
              Do this once. Simba Tasker checks your face photo, owner ID and driving / plant licence before you can go live.
            </p>
            <OwnerOperatorSetup />
          </>
        )
      ) : null}
      {allOptions ? null : (
        <button
          type="button"
          className="log-who-operates__more"
          data-testid="operated-by-more"
          onClick={() => setShowAll(true)}
        >
          Someone else will operate it
        </button>
      )}
    </div>
  );
}

/**
 * "Use this unit myself" on Availability, Fleet and the unit page. When an
 * operator holds the unit, shows "In use by X" with the Unassign action.
 */
export function UnitOperateControl({ asset, onChanged, compact = false }) {
  const dispatch = useDispatch();
  const op = useOwnerOperator();
  const ownerOn = useOwnerOnUnit(asset);
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  if (!isFleetOwnerUser() || !asset || Number(asset.is_active) === 0) return null;

  const occ = unitOccupancy(asset);
  const cls = `log-unit-op${compact ? " log-unit-op--compact" : ""}`;

  const claim = async () => {
    if (!op?.can_operate) {
      setSetupOpen(true);
      return;
    }
    setBusy(true);
    try {
      const fix = await readDeviceGps(8000);
      const res = await dispatch(
        LogisticsActions.operateSelf({
          id: asset._id,
          state: "available_now",
          ...(fix
            ? { lat: fix.lat, lng: fix.lng, location: { lat: fix.lat, lng: fix.lng }, last_verified_at: new Date().toISOString() }
            : {}),
        })
      );
      if (isApiFailure(res)) {
        if (apiErrorCode(res?.payload) === "OWNER_NOT_ELIGIBLE") {
          await refreshLogisticsAccount();
          setSetupOpen(true);
        }
        toast.error(apiErrorMessage(res?.payload, "Could not start using this unit"), { autoClose: 8000 });
        await onChanged?.();
        return;
      }
      toast.success(fix ? `You are live on ${asset.name}` : `You are live on ${asset.name}. Allow location access so Now jobs can find you.`);
      await refreshLogisticsAccount();
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const release = async () => {
    setBusy(true);
    try {
      const res = await dispatch(LogisticsActions.releaseSelf(asset._id));
      if (isApiFailure(res)) {
        toast.error(apiErrorMessage(res?.payload, "Could not stop using this unit"), { autoClose: 8000 });
        return;
      }
      toast.success(`You are offline — ${asset.name} is free`);
      await refreshLogisticsAccount();
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const unassign = async () => {
    const name = occ.operator?.name || "this operator";
    if (!window.confirm(`Unassign ${name} from ${asset.name}? They go offline and stop seeing its jobs.`)) return;
    setBusy(true);
    try {
      const res = await dispatch(
        LogisticsActions.unassignOperator({ id: asset._id, sub_user_id: occ.operator?.id })
      );
      if (isApiFailure(res)) {
        toast.error(apiErrorMessage(res?.payload, "Could not unassign"), { autoClose: 8000 });
        await onChanged?.();
        return;
      }
      toast.success(`${name} unassigned — the unit is free`);
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const onJob = Boolean(occ.job_id) || occ.reason === "on_job";
  const jobLink = occ.job_id ? (
    <Link
      className="log-unit-op__job log-unit-op__btn log-unit-op__btn--job"
      data-testid="unit-view-job"
      to={`/logistics/owner/job/${occ.job_id}`}
    >
      View job
    </Link>
  ) : null;

  let body;
  if (ownerOn) {
    body = (
      <>
        {/* Pulses while the owner is on this unit and it has a running job */}
        <span
          className={`log-chip log-chip--active${onJob ? " log-chip--live" : ""}`}
          data-testid="unit-owner-operating"
        >
          You are operating this
        </span>
        {/* v2.7.71 (client test B4): being online lasts until the next check-in */}
        {op?.available_until && occ.reason !== "on_job" ? (
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            data-testid="unit-confirm-online"
            disabled={busy}
            onClick={claim}
            title="Confirm you're still here with this unit"
          >
            {busy
              ? "Saving…"
              : `Still here? Confirm (online until ${new Date(op.available_until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
          </button>
        ) : null}
        {jobLink}
        <Link
          className="log-unit-op__job log-unit-op__btn"
          data-testid="open-operator-dashboard"
          to="/logistics/driver"
        >
          Open dashboard
        </Link>
        {occ.reason === "on_job" ? null : (
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            data-testid="stop-using-unit"
            disabled={busy}
            onClick={release}
          >
            {busy ? "Saving…" : "Stop using"}
          </button>
        )}
      </>
    );
  } else if (occ.busy) {
    body = (
      <>
        <span className="log-chip log-chip--progress" data-testid="unit-in-use">{occupancyLabel(asset)}</span>
        {jobLink}
        {occ.operator?.id ? (
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            data-testid="unit-unassign"
            disabled={busy}
            onClick={unassign}
          >
            {busy ? "Saving…" : "Unassign"}
          </button>
        ) : null}
      </>
    );
  } else {
    body = (
      <button
        type="button"
        className="logistics-cta logistics-cta--ghost log-unit-op__use"
        data-testid="use-unit-myself"
        disabled={busy}
        onClick={claim}
      >
        {busy ? "Going live…" : "Use this unit myself"}
      </button>
    );
  }

  return (
    <div className={cls} data-unit-op={asset._id}>
      {body}
      <Modal
        show={setupOpen}
        onHide={() => setSetupOpen(false)}
        scrollable
        enforceFocus={false}
        className="log-onboard-modal"
        data-testid="owner-operator-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Operate your own units</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <OwnerOperatorSetup />
        </Modal.Body>
        <Modal.Footer>
          <button type="button" className="logistics-cta logistics-cta--ghost" onClick={() => setSetupOpen(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
