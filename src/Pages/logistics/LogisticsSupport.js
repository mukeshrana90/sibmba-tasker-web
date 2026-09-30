import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import "./logistics.css";

/**
 * Contact app admin via existing Helpandsupport API
 * (POST /customer/add_helpandsupport — same ticket admin lists).
 */
export default function LogisticsSupport({
  homeTo = "/logistics/driver",
  midLabel = "Operator",
}) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter a subject and message");
      return;
    }
    setSending(true);
    try {
      const prefix = midLabel === "Owner" ? "[Logistics Owner]" : "[Logistics Operator]";
      const res = await dispatch(
        CustomerActions.addHelpAndSupport({
          title: `${prefix} ${title.trim()}`,
          message: message.trim(),
        })
      );
      if (res?.payload?.success === false || res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not send message");
        return;
      }
      toast.success("Message sent to Simba Tasker admin");
      setTitle("");
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  return (
    <LogisticsPageShell
      title="Support"
      crumbLabel="Support"
      midCrumb={{ to: homeTo, label: midLabel }}
      homeTo={homeTo}
    >
      <form className="log-form-card log-support-form" onSubmit={submit}>
        <p className="log-op-lead">
          Message the Simba Tasker app admin. Your ticket appears in the admin
          Help &amp; Support inbox.
        </p>

        <label className="log-field">
          <span>Subject</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cannot update availability"
            maxLength={120}
            required
          />
        </label>

        <label className="log-field">
          <span>Message</span>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue. Include job IDs or plate numbers if relevant."
            required
          />
        </label>

        <button
          type="submit"
          className="logistics-cta logistics-cta--primary"
          disabled={sending}
        >
          {sending ? "Sending…" : "Send to admin"}
        </button>
      </form>
    </LogisticsPageShell>
  );
}
