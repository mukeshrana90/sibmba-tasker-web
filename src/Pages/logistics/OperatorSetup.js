import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsFacePhotoField from "../../CommanComponents/LogisticsFacePhotoField";
import LogisticsOperatorDocRows from "../../CommanComponents/LogisticsOperatorDocRows";
import {
  refreshLogisticsAccount,
  useLogisticsAccount,
} from "../../CommanComponents/LogisticsAccountBanner";
import { operatorNeedsSetup } from "../../routes/PrivateLogisticsDriver";
import { docReviewChip } from "../../utils/docExpiry";
import { publicUrl } from "../../CommanComponents/LogisticsOperatorDocRows";
import "./logistics.css";

const LICENCE_ROW = [{ id: "licence", label: "Driving / plant licence", hint: "Photo or PDF of your licence" }];
const NEEDS_UPLOAD = new Set(["missing", "rejected", "expired"]);

/**
 * 12 Nov 2026 (client): the owner only invites by name + phone / email. The operator's
 * first screen after accepting asks for their own live selfie and driving licence.
 * Both are required; the dashboard opens once they're uploaded (Simba then checks them).
 */
export default function OperatorSetup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const account = useLogisticsAccount();
  const [face, setFace] = useState(null);
  const [facePreview, setFacePreview] = useState("");
  const [licence, setLicence] = useState(null);
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(
    () => () => {
      if (facePreview) URL.revokeObjectURL(facePreview);
    },
    [facePreview]
  );

  const isOperator = Boolean(localStorage.getItem("owner_id"));
  if (!isOperator) return <Navigate to="/logistics/driver" replace />;

  const faceState = account?.operator_face || null;
  const licState = account?.operator_licence || null;
  const faceDue = NEEDS_UPLOAD.has(faceState?.status || "missing");
  const licDue = Boolean(licState?.required ?? true) && NEEDS_UPLOAD.has(licState?.status || "missing");
  const faceChip = docReviewChip({ status: faceState?.status, reason: faceState?.reason });
  const licChip = docReviewChip({ status: licState?.status, reason: licState?.reason });

  const save = async () => {
    if (faceDue && !face) {
      toast.error("Take your selfie first");
      return;
    }
    if (licDue && !licence) {
      toast.error("Upload your driving / plant licence");
      return;
    }
    if (licence && !expires) {
      toast.error("Driving / plant licence: expiry date is required");
      return;
    }
    if (!face && !licence) {
      navigate("/logistics/driver");
      return;
    }
    setSaving(true);
    try {
      if (face) {
        const fd = new FormData();
        fd.append("face_photo", face);
        const res = await dispatch(LogisticsActions.updateMyFacePhoto(fd));
        if (!res?.payload?.success) {
          toast.error(res?.payload?.message || "Could not save your selfie");
          return;
        }
        setFace(null);
        setFacePreview("");
      }
      if (licence) {
        const fd = new FormData();
        fd.append("doc_licence", licence);
        fd.append("doc_licence_expires", expires);
        const res = await dispatch(LogisticsActions.updateMyDocuments(fd));
        if (!res?.payload?.success) {
          toast.error(res?.payload?.message || "Could not save your licence");
          await refreshLogisticsAccount();
          return;
        }
        setLicence(null);
      }
      const fresh = await refreshLogisticsAccount();
      toast.success("Saved — Simba will check your selfie and licence");
      if (!operatorNeedsSetup(fresh)) navigate("/logistics/driver", { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="logistics-page log-operator-setup" data-testid="operator-setup">
      <div className="log-form-card log-operator-setup__card">
        <h1 className="log-sect" style={{ marginTop: 0 }}>Finish setting up your account</h1>
        <p className="log-hint">
          Before you can go live, take a live selfie and upload your driving / plant licence. Customers see your face
          once a job is accepted. Simba checks both.
        </p>

        <LogisticsFacePhotoField
          preview={facePreview || (faceDue ? "" : publicUrl(faceState?.url) || "")}
          canRemove={Boolean(face)}
          onCapture={(f) => {
            setFace(f);
            setFacePreview(URL.createObjectURL(f));
          }}
          onRemove={() => {
            setFace(null);
            setFacePreview("");
          }}
          label="Your selfie"
          required={faceDue}
          hint="Use the camera — look straight at it in good light."
        />
        {faceChip && !face ? (
          <span className={`log-chip log-chip--${faceChip.tone} log-doc-review`} data-review={faceState?.status}>
            Selfie: {faceChip.label}
            {faceState?.status === "rejected" && faceState?.reason ? ` — ${faceState.reason}` : ""}
          </span>
        ) : null}

        <div className="log-field log-field--full" style={{ marginTop: 16 }}>
          <span className="log-fl">
            Driving / plant licence {licDue ? <span className="log-req">*</span> : null}
          </span>
          <LogisticsOperatorDocRows
            items={LICENCE_ROW}
            docs={{
              licence: {
                file: licence,
                name: licence?.name || null,
                expires,
                review: licence ? null : licState?.status && licState.status !== "missing" ? { status: licState.status, reason: licState.reason } : null,
              },
            }}
            onPick={(_id, f) => setLicence(f)}
            onExpiry={(_id, v) => setExpires(v)}
          />
          {licChip && !licence && licState?.status !== "missing" ? (
            <span className={`log-chip log-chip--${licChip.tone} log-doc-review`} data-review={licState?.status}>
              Licence: {licChip.label}
              {licState?.status === "rejected" && licState?.reason ? ` — ${licState.reason}` : ""}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="logistics-cta logistics-cta--primary"
          data-testid="operator-setup-save"
          disabled={saving}
          onClick={save}
          style={{ marginTop: 18 }}
        >
          {saving ? "Saving…" : faceDue || licDue ? "Save and continue" : "Continue to dashboard"}
        </button>
      </div>
    </div>
  );
}
