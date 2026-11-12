import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import LogisticsFaceCamera from "./LogisticsFaceCamera";

const COPY = {
  rejected: "Simba rejected your face photo. Take a new one so you can go live.",
  pending: "Simba is checking your face photo.",
  missing: "Add your face photo so you can go live.",
};

/** Operator dashboard: their own face photo, updated only with a live selfie. */
export default function LogisticsOperatorFaceCard() {
  const dispatch = useDispatch();
  const [face, setFace] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    dispatch(LogisticsActions.getMe()).then((res) => {
      if (alive) setFace(res?.payload?.data?.user?.operator_face || res?.payload?.data?.operator_face || null);
    });
    return () => {
      alive = false;
    };
  }, [dispatch]);

  if (!face) return null;

  const onCapture = async (file) => {
    const fd = new FormData();
    fd.append("face_photo", file);
    setSaving(true);
    const res = await dispatch(LogisticsActions.updateMyFacePhoto(fd));
    setSaving(false);
    if (res?.payload?.success) {
      toast.success("Saved — Simba will check your photo");
      setFace({ ...face, status: "pending", reason: "" });
    } else {
      toast.error(res?.payload?.message || "Could not save your photo");
    }
  };

  const verified = face.status === "verified";
  return (
    <section
      className={`log-callout ${face.status === "rejected" ? "log-callout--danger" : verified ? "" : "log-callout--warn"}`}
      data-testid="operator-face-card"
      data-status={face.status}
    >
      <p>
        <strong>{verified ? "Your face photo is verified." : COPY[face.status] || COPY.missing}</strong>
        {face.reason ? ` Reason: ${face.reason}.` : ""}
      </p>
      <button
        type="button"
        className="logistics-cta logistics-cta--ghost"
        onClick={() => setOpen(true)}
        disabled={saving}
        data-testid="operator-face-update"
      >
        {saving ? "Saving…" : "Update with a selfie"}
      </button>
      <LogisticsFaceCamera show={open} onHide={() => setOpen(false)} onCapture={onCapture} title="Take a selfie" />
    </section>
  );
}
