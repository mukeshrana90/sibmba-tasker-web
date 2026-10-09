import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsSosBanner, { sosLocationNote } from "../../CommanComponents/LogisticsSosBanner";
import "./logistics.css";
import {
  LogisticsTableSkeletonRows,
} from "../../CommanComponents/LogisticsSkeleton";

const STATUS_CHIP = {
  open: { label: "Open", chip: "log-chip--closed" },
  acknowledged: { label: "Acknowledged", chip: "log-chip--progress" },
  resolved: { label: "Resolved", chip: "log-chip--done" },
};

/** Owner: every SOS raised by their operators or customers on their jobs. */
export default function OwnerSos() {
  const dispatch = useDispatch();
  const [rows, setRows] = useState([]);
  const [active, setActive] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, live] = await Promise.all([
        dispatch(LogisticsActions.getOwnerSos({ status: status || undefined, page, limit: 20 })),
        dispatch(LogisticsActions.getOwnerSos({ status: "active", limit: 10 })),
      ]);
      if (list?.payload?.success === false) toast.error(list.payload.message || "Could not load");
      setRows(list?.payload?.data?.data || []);
      setPages(list?.payload?.data?.pages || 1);
      setActive(live?.payload?.data?.data || []);
    } finally {
      setLoading(false);
    }
  }, [dispatch, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onEvt = (e) => {
      const t = String(e?.detail?.type || "");
      if (t.startsWith("LOGISTICS_SOS")) load();
    };
    window.addEventListener("simba:logistics_notification", onEvt);
    return () => window.removeEventListener("simba:logistics_notification", onEvt);
  }, [load]);

  return (
    <LogisticsPageShell
      title="SOS log"
      crumbLabel="SOS"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      <LogisticsSosBanner alerts={active} onChanged={load} />

      <form className="log-jobs-toolbar" onSubmit={(e) => e.preventDefault()}>
        <label className="log-field" style={{ margin: 0 }}>
          <span className="log-fl">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="active">Open + acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
      </form>

      <div className="log-jobs-table-wrap">
        <table className="log-jobs-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Job / unit</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && !rows.length ? <LogisticsTableSkeletonRows cols={5} /> : null}
            {rows.map((a) => {
              const st = STATUS_CHIP[a.status] || STATUS_CHIP.open;
              return (
                <tr key={a._id}>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    <b>{a.user?.full_name || "User"}</b>
                    <p className="log-hint" style={{ margin: 0 }}>
                      {a.role}
                      {a.user?.phone_number
                        ? ` · ${[a.user.country_code, a.user.phone_number].filter(Boolean).join(" ")}`
                        : ""}
                    </p>
                  </td>
                  <td>
                    {a.job_number ? (
                      <Link to={`/logistics/owner/job/${a.job_id}`}>#{a.job_number}</Link>
                    ) : (
                      "—"
                    )}
                    {a.asset ? (
                      <p className="log-hint" style={{ margin: 0 }}>
                        {a.asset.name} {a.asset.registration || ""}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    {a.map_url ? (
                      <a href={a.map_url} target="_blank" rel="noreferrer">
                        Maps
                      </a>
                    ) : (
                      "Not shared"
                    )}
                    {sosLocationNote(a) ? (
                      <p className="log-hint" style={{ margin: 0 }}>{sosLocationNote(a)}</p>
                    ) : null}
                    {a.source === "sms" ? (
                      <p className="log-hint" style={{ margin: 0 }}>via SMS</p>
                    ) : null}
                  </td>
                  <td>
                    <span className={`log-chip ${st.chip}`}>{st.label}</span>
                    {a.resolve_note ? (
                      <p className="log-hint" style={{ margin: "4px 0 0" }}>{a.resolve_note}</p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={5} className="logistics-empty">
                  No SOS alerts.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="log-jobs-pager">
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="logistics-cta logistics-cta--ghost"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </LogisticsPageShell>
  );
}
