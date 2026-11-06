import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../Redux/Actions/LogisticsActions";
import { apiErrorMessage, isApiFailure } from "../utils/ownerOperator";

/**
 * "Chat on WhatsApp" (item 41). Asks /can first and stays hidden when not
 * allowed, or when the API doesn't offer it. The number is only fetched on click
 * and the server logs who started the chat.
 */
export default function LogisticsWhatsappChatButton({ jobId, assetId, compact = false, className = "" }) {
  const dispatch = useDispatch();
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const target = jobId ? { job_id: jobId } : assetId ? { asset_id: assetId } : null;
  const key = jobId || assetId || "";

  useEffect(() => {
    let alive = true;
    setAllowed(false);
    if (!key || !localStorage.getItem("token")) return undefined;
    dispatch(LogisticsActions.whatsappChatCan(target)).then((res) => {
      if (alive) setAllowed(!isApiFailure(res) && res?.payload?.data?.allowed === true);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, key]);

  if (!allowed) return null;

  const start = async () => {
    // Opened synchronously so the browser doesn't treat it as a pop-up
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const res = await dispatch(LogisticsActions.whatsappChatStart(target));
      const url = res?.payload?.data?.url;
      if (isApiFailure(res) || !url) {
        if (tab) tab.close();
        toast.error(apiErrorMessage(res?.payload, "Could not open WhatsApp"));
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`log-wa-chat-btn${compact ? " log-wa-chat-btn--compact" : ""}${className ? ` ${className}` : ""}`}
      data-testid="whatsapp-chat"
      disabled={busy}
      onClick={start}
      title="Chat on WhatsApp"
      aria-label="Chat on WhatsApp"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4Z" />
      </svg>
      {compact ? null : <span>Chat on WhatsApp</span>}
    </button>
  );
}
