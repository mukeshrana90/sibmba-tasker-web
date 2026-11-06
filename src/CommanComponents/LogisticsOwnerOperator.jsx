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
import { keepAllowedFiles } from "../utils/uploadLimits";
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

/** The signed-in owner's operator state (null until /me reports it). */
export function useOwnerOperator() {
  return useLogisticsAccount()?.owner_operator || null;
}

/**
 * One-time licence and face photo for an owner who wants to operate units.
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
  const licenceFromOwnerId = op?.licence?.source === "owner_id" && !op?.licence?.needs_upload;
  const hasFace = Boolean(op?.face_photo?.url);
  const licenceChip = docReviewChip({ status: op?.licence?.status, reason: op?.licence?.reason });
  const faceChip = docReviewChip({ status: op?.face_photo?.status, reason: op?.face_photo?.reason });

  const save = async () => {
    if (!licence && !face) {
      toast.error("Choose your licence or face photo to upload");
      return;
    }
    if (!hasLicence && !licence) {
      toast.error("Add your driving / plant licence");
      return;
    }
    if (!hasFace && !face) {
      toast.error("Add a clear photo of your face");
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
      toast.success("Saved — Simba will check your licence and face photo");
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
        onPick={(e) => {
          const [f] = keepAllowedFiles(e.target.files, { imagesOnly: true });
          e.target.value = "";
          if (!f) return;
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
          We&apos;ll use the driving licence you added as your owner ID{op.licence.status === "verified" ? "." : ". Simba is checking it."}
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
        <p className="log-field-error">Upload a new licence so Simba can check it again.</p>
      ) : null}
      <button
        type="button"
        className="logistics-cta logistics-cta--primary log-owner-op-setup__save"
        data-testid="owner-operator-save"
        disabled={saving || (!licence && !face)}
        onClick={save}
      >
        {saving ? "Saving…" : licenceFromOwnerId && !hasFace ? "Save photo" : hasLicence || hasFace ? "Save changes" : "Save licence and photo"}
      </button>
    </div>
  );
}

/** Availability: the owner's own licence and face photo, once they have started operating. */
export function OwnerOperatorCard() {
  const op = useOwnerOperator();
  useDocDeepLink();
  if (!isFleetOwnerUser() || !op?.enabled) return null;
  return (
    <section className="log-form-card log-owner-op-card" data-testid="owner-operator-card" data-doc-anchor="face_photo">
      <h2 className="log-sect" style={{ marginTop: 0 }}>Operating units yourself</h2>
      {op.can_operate ? (
        <p className="log-hint" data-testid="owner-operator-ready">
          Your licence, face photo and owner ID are verified. Use a free unit below, or{" "}
          <Link to="/logistics/driver">open your operator dashboard</Link>.
        </p>
      ) : (
        <p className="log-hint">You can go live after Simba verifies your licence, face photo and owner ID.</p>
      )}
      <OwnerOperatorSetup />
    </section>
  );
}

/** Add unit: "Who operates this?" */
export function WhoOperatesField({ value, onChange }) {
  const op = useOwnerOperator();
  const self = value === "self";
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
        <label className={`log-who-operates__opt${!self ? " is-selected" : ""}`} data-testid="operated-by-invite">
          <input type="radio" name="operated_by" value="invite" checked={!self} onChange={() => onChange("invite")} />
          <span>
            <b>Invite an operator</b>
            <small>Assign or invite them after saving. They quote and run the jobs.</small>
          </span>
        </label>
      </div>
      {self ? (
        op?.can_operate ? (
          <p className="log-hint" data-testid="owner-operator-ready">Your licence and face photo are verified. You can go live on this unit once it is saved.</p>
        ) : (
          <>
            <p className="log-hint">
              Upload these once. Simba checks your licence, face photo and owner ID before you can go live.
            </p>
            <OwnerOperatorSetup />
          </>
        )
      ) : null}
    </div>
  );
}

/**
 * "Use this unit myself" on Availability, Fleet and the unit page. When an
 * operator holds the unit, shows "In use by X" with the Unassign action.
 */
export function UnitOperateControl({ asset, onChanged, compact = false }) {
  const dispatch = useDispatch();
  const account = useLogisticsAccount();
  const op = account?.owner_operator || null;
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  if (!isFleetOwnerUser() || !asset || Number(asset.is_active) === 0) return null;

  const occ = unitOccupancy(asset);
  const ownerOn =
    occ.by === "owner" || (op?.active_asset_id && String(op.active_asset_id) === String(asset._id));
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

  const jobLink = occ.job_id ? (
    <Link className="log-unit-op__job" data-testid="unit-view-job" to={`/logistics/owner/job/${occ.job_id}`}>
      View job
    </Link>
  ) : null;

  let body;
  if (ownerOn) {
    body = (
      <>
        <span className="log-chip log-chip--active" data-testid="unit-owner-operating">You are operating this</span>
        {jobLink}
        <Link className="log-unit-op__job" data-testid="open-operator-dashboard" to="/logistics/driver">
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
          <p className="log-hint">
            Upload your licence and face photo once. You can go live after Simba verifies them and your owner ID.
          </p>
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
