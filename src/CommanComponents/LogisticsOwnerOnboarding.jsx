import { useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import LogisticsLocationField from "./LogisticsLocationField";
import { BusinessDocsPanel } from "./LogisticsBusinessDocs";
import { refreshLogisticsAccount, useLogisticsAccount } from "./LogisticsAccountBanner";
import "../Pages/logistics/logistics.css";

/**
 * 30 Oct 2026: first screen for an Equipment Owner who still has company
 * details to give — Google / Apple sign-up (no sign-up form) or a skipped
 * sign-up step 2. Asks the business name (required), business location
 * (optional) and the business documents (registration + owner ID required).
 * "Later" closes it for this visit; it comes back on the owner dashboard
 * until the required items are done.
 */
export default function LogisticsOwnerOnboarding() {
  const dispatch = useDispatch();
  const account = useLogisticsAccount();
  const [dismissed, setDismissed] = useState(false);
  const [company, setCompany] = useState("");
  const [base, setBase] = useState({ address: "", coords: null });
  const [saving, setSaving] = useState(false);

  const missingDocs = account?.business_docs_missing || [];
  const needsName = account ? !String(account.company_name || "").trim() : false;
  const needed = account?.approval?.status === "pending" && (needsName || missingDocs.length > 0);
  const show = Boolean(needed && !dismissed);

  useEffect(() => {
    if (!show) return;
    setCompany((c) => c || account?.company_name || "");
    if (account?.logistics_base?.lat != null) {
      setBase((b) =>
        b.coords ? b : { address: account.logistics_base.address || "", coords: [Number(account.logistics_base.lng), Number(account.logistics_base.lat)] }
      );
    }
  }, [show, account]);

  const save = async () => {
    const name = company.replace(/\s+/g, " ").trim();
    if (!name) {
      toast.error("Business name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.patchMe({
          company_name: name,
          ...(base.coords ? { logistics_base: { address: base.address, lat: Number(base.coords[1]), lng: Number(base.coords[0]) } } : {}),
        })
      );
      if (res?.payload?.success === false || res?.error) {
        toast.error(res?.payload?.message || "Could not save your business details");
        return;
      }
      const fresh = await refreshLogisticsAccount();
      if ((fresh?.business_docs_missing || []).length) {
        toast.info("Details saved — now upload the required business documents below");
      } else {
        toast.success("Thanks — Simba will check your documents and approve your company");
        setDismissed(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={() => setDismissed(true)} size="lg" scrollable enforceFocus={false} className="log-onboard-modal" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Complete your business details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="log-hint mb-3">
          Simba approves your company after checking these. You can add equipment and invite operators once it&apos;s approved.
        </p>
        <div className="log-onboard-grid">
          <label className="log-onboard-field">
            <span>
              Business name <span className="log-req">*</span>
            </span>
            <input
              type="text"
              name="onboard_company_name"
              maxLength={80}
              placeholder="Company or trading name"
              value={company}
              onChange={(e) => setCompany(e.target.value.replace(/(^|[\s'-])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase()))}
            />
          </label>
          <div className="log-onboard-field">
            <span>
              Business location <span className="log-onboard-opt">(optional)</span>
            </span>
            <LogisticsLocationField
              address={base.address}
              coords={base.coords}
              title="Business location"
              hint="Where your trucks / equipment are usually based. Search or pin it on the map."
              chooseLabel="Choose your business location"
              onChange={({ address, coords }) => setBase({ address: address || "", coords: coords || null })}
            />
          </div>
        </div>
        <div className="log-onboard-docs">
          <b>Business documents</b>
          <BusinessDocsPanel />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="logistics-cta logistics-cta--ghost log-onboard-later" onClick={() => setDismissed(true)}>
          Later
        </button>
        <button type="button" className="logistics-cta logistics-cta--primary log-onboard-save" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
