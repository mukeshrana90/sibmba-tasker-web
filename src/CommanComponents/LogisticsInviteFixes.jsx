import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import LogisticsFaceCamera from "./LogisticsFaceCamera";

/** Pending invite row: retake the face photo before the operator accepts. */
export default function LogisticsInviteFixes({ invite, onSaved }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const rejected = invite.face_review?.status === "rejected";

  const onCapture = async (file) => {
    const formData = new FormData();
    formData.append("profile_photo", file);
    const res = await dispatch(LogisticsActions.patchInvite({ id: invite._id, formData }));
    if (res?.payload?.success) {
      toast.success("Photo updated — Simba Tasker will check it");
      onSaved?.();
    } else {
      toast.error(res?.payload?.message || "Could not save the photo");
    }
  };

  return (
    <div className="log-invite-fix">
      {rejected ? (
        <p className="log-field-error" data-testid="invite-face-rejected">
          Face photo rejected{invite.face_review?.reason ? `: ${invite.face_review.reason}` : ""}. Take a new one.
        </p>
      ) : null}
      <button type="button" className="logistics-cta logistics-cta--ghost" onClick={() => setOpen(true)} data-testid="invite-face-retake">
        Retake face photo
      </button>
      <LogisticsFaceCamera show={open} onHide={() => setOpen(false)} onCapture={onCapture} />
    </div>
  );
}
