import Modal from "react-bootstrap/Modal";
import { toast } from "react-toastify";

function shareLinks(url) {
  const encoded = encodeURIComponent(url);
  return {
    whatsapp: `https://wa.me/?text=${encoded}`,
    email: `mailto:?subject=${encodeURIComponent("Location")}&body=${encoded}`,
  };
}

export default function ShareLocationModal({
  show,
  onHide,
  url,
  title = "Share location",
}) {
  const links = url ? shareLinks(url) : null;

  const copyLink = async () => {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        window.prompt("Copy this location link:", url);
      }
      toast.success("Location copied.");
      onHide();
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const shareNative = async () => {
    if (!url || typeof navigator.share !== "function") return;
    const shareData = {
      title: "Live location",
      text: "View this location on Google Maps",
      url,
    };
    try {
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        onHide();
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        toast.error("Sharing is not available on this device.");
      }
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered className="share-location-modal">
      <Modal.Header closeButton className="border-none pb-0">
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="comman-small-pop share-location-pop">
          <p className="share-location-lead">
            Share this Google Maps link with your contacts or apps.
          </p>
          {url ? (
            <div className="share-location-url" title={url}>
              {url}
            </div>
          ) : null}
          <div className="share-location-actions">
            {typeof navigator.share === "function" && (
              <button type="button" className="btn btn-primary" onClick={shareNative}>
                Share with apps
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={copyLink}>
              Copy link
            </button>
            {links ? (
              <>
                <a
                  href={links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  onClick={onHide}
                >
                  WhatsApp
                </a>
                <a href={links.email} className="btn btn-ghost" onClick={onHide}>
                  Email
                </a>
              </>
            ) : null}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
}
