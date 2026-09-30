import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import LogisticsFleetMap, {
  isLocalNowJob,
} from "../../CommanComponents/LogisticsFleetMap";
import { toast } from "react-toastify";
import { logisticsSupplyNeedsSubscription } from "../../utils/chatAccess";
import { getActiveModule } from "../../utils/Roles";
import {
  messagesPath,
  persistReceiverId,
} from "../../utils/normalizeMongoId";
import "./logistics.css";

function placeShort(address) {
  if (!address) return "—";
  const part = String(address).split(",")[0];
  return part.trim() || address;
}

export default function LogisticsOwnerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showJobs, setShowJobs] = useState(true);
  const [showLocalJobs, setShowLocalJobs] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await dispatch(LogisticsActions.getDashboard());
        setDash(res?.payload?.data || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [dispatch]);

  const vehicles = dash?.map_vehicles || [];
  const mapVehicles = vehicles.filter(
    (v) =>
      Number.isFinite(Number(v.live_location?.lat)) &&
      Number.isFinite(Number(v.live_location?.lng))
  );
  const jobs = dash?.pending_jobs || [];
  // Server already limits Now jobs to those within range of the owner's trucks
  const localJobCount = jobs.filter(isLocalNowJob).length;

  const statusLabel = (state) => {
    const s = String(state || "offline");
    if (s === "available_now") return "Available now";
    if (s === "returning_empty") return "Return empty";
    if (s === "scheduled" || s === "available_tomorrow") return "Available tomorrow";
    if (s === "on_job") return "On job";
    return "Offline";
  };

  const messageOperator = async (operatorId) => {
    if (!operatorId) return;
    const role = Number(localStorage.getItem("role"));
    try {
      const me = await dispatch(LogisticsActions.getMe());
      const user = me?.payload?.data?.user || {};
      if (
        logisticsSupplyNeedsSubscription({
          role: user.role ?? role,
          isSubscribed: user.isSubscribed,
          activeModule: getActiveModule(),
        })
      ) {
        toast.info("An active fleet subscription is required to message operators");
        return;
      }
    } catch {
      /* MainChat still gates reply */
    }
    persistReceiverId(operatorId);
    try {
      sessionStorage.setItem(
        "chatPeerHint",
        JSON.stringify({ _id: String(operatorId), full_name: "Operator" })
      );
    } catch {
      /* ignore */
    }
    navigate(messagesPath(operatorId));
  };

  return (
    <LogisticsPageShell
      title="Owner dashboard"
      crumbLabel="Dashboard"
      midCrumb={{ to: "/logistics/owner", label: "Owner" }}
      homeTo="/logistics/owner"
    >
      {loading && !dash ? (
        <p className="logistics-empty">Loading dashboard…</p>
      ) : (
        <div className="log-owner-dash">
          <section className="log-owner-dash__map-wrap">
            <div className="log-owner-dash__map-head">
              <div>
                <h2>Fleet &amp; pending jobs</h2>
                <p>
                  Vehicle pins: red truck = offline; yellow truck = available;
                  green truck = on route / job accepted. Blue package pin =
                  open jobs pending quotes. Amber ⚡ pin = local (Now) job near
                  your trucks — quote before it expires.
                </p>
              </div>
              <div className="log-owner-dash__legend">
                <span className="is-vehicle-offline">Offline</span>
                <span className="is-vehicle-available">Available</span>
                <span className="is-vehicle-route">On route</span>
                <span className="is-job">Pending job</span>
                <span className="is-local-job">Local job (Now)</span>
              </div>
            </div>
            <div className="log-owner-dash__map-toggles" role="group" aria-label="Map layers">
              <label className="log-check">
                <input
                  type="checkbox"
                  checked={showVehicles}
                  onChange={(e) => setShowVehicles(e.target.checked)}
                />
                <span>Show vehicles</span>
              </label>
              <label className="log-check">
                <input
                  type="checkbox"
                  checked={showJobs}
                  onChange={(e) => setShowJobs(e.target.checked)}
                />
                <span>Show pending jobs</span>
              </label>
              <label className="log-check">
                <input
                  type="checkbox"
                  checked={showLocalJobs}
                  onChange={(e) => setShowLocalJobs(e.target.checked)}
                />
                <span>
                  Show local jobs
                  {localJobCount ? (
                    <span className="log-owner-dash__local-count">
                      {localJobCount}
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
            <LogisticsFleetMap
              vehicles={mapVehicles}
              jobs={jobs}
              showVehicles={showVehicles}
              showJobs={showJobs}
              showLocalJobs={showLocalJobs}
              jobHrefBase="/logistics/owner/job"
              height={440}
            />
          </section>

          <div className="logistics-stats">
            <div>
              <strong>{dash?.active_jobs ?? 0}</strong>
              <span>Active jobs</span>
            </div>
            <div>
              <strong>{dash?.completed_jobs ?? 0}</strong>
              <span>Completed</span>
            </div>
            <div>
              <strong>
                {dash?.earnings?.amount ?? 0} {dash?.earnings?.currency || "USD"}
              </strong>
              <span>Earnings</span>
            </div>
          </div>

          <div className="log-owner-dash__panels">
            <section className="log-form-card">
              <div className="log-owner-dash__panel-head">
                <h3>Fleet vehicles</h3>
                <Link to="/logistics/owner/availability">Manage availability</Link>
              </div>
              <ul className="log-owner-dash__list">
                {vehicles.slice(0, 4).map((v) => {
                  const hasGps =
                    Number.isFinite(Number(v.live_location?.lat)) &&
                    Number.isFinite(Number(v.live_location?.lng));
                  const opName =
                    v.live_location?.operator_name ||
                    v.operator_name ||
                    "";
                  const opId = v.live_location?.operator_id || v.operator_id;
                  const pinKind = v.live_location?.pin_kind || v.live_location?.source;
                  const gpsLabel = !hasGps
                    ? "No location on file"
                    : pinKind === "live" || pinKind === "operator"
                      ? v.live_location?.updated_at
                        ? `GPS live · ${new Date(
                            v.live_location.updated_at
                          ).toLocaleString()}`
                        : "GPS live"
                      : pinKind === "home"
                        ? "Create / home location"
                        : v.live_location?.updated_at
                          ? `Last GPS · ${new Date(
                              v.live_location.updated_at
                            ).toLocaleString()}`
                          : "Last known location";
                  return (
                    <li key={v.asset_id}>
                      <div>
                        <b>{v.name}</b>
                        <p>
                          {statusLabel(v.availability)}
                          {opName ? ` · Operator ${opName}` : " · No operator"}
                          {` · ${gpsLabel}`}
                        </p>
                      </div>
                      <div className="log-owner-dash__row-actions">
                        {opId ? (
                          <button
                            type="button"
                            className="logistics-cta logistics-cta--ghost"
                            onClick={() => messageOperator(opId)}
                          >
                            Message
                          </button>
                        ) : null}
                        <Link
                          className="logistics-cta logistics-cta--ghost"
                          to={`/logistics/owner/fleet/${v.asset_id}`}
                        >
                          Vehicle
                        </Link>
                      </div>
                    </li>
                  );
                })}
                {!vehicles.length && (
                  <li className="logistics-empty">
                    No trucks in the fleet yet. Add vehicles under My Vehicles.
                  </li>
                )}
                {vehicles.length > 4 ? (
                  <li className="log-owner-dash__more">
                    <Link to="/logistics/owner/availability">
                      +{vehicles.length - 4} more — Manage availability
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="log-form-card">
              <div className="log-owner-dash__panel-head">
                <h3>Pending jobs</h3>
                <Link to="/logistics/owner/opportunities">View all</Link>
              </div>
              <ul className="log-owner-dash__list">
                {jobs.slice(0, 4).map((j) => (
                  <li key={j.job_id}>
                    <div>
                      <b>{j.load_type || "Transport job"}</b>
                      <p>
                        {placeShort(j.pickup_address)} →{" "}
                        {placeShort(j.dropoff_address)}
                        {j.budget?.amount != null
                          ? ` · ${j.budget.currency || "USD"} ${j.budget.amount}`
                          : ""}
                      </p>
                    </div>
                    <div className="log-owner-dash__row-actions">
                      <Link
                        className="logistics-cta logistics-cta--primary"
                        to={`/logistics/owner/job/${j.job_id}`}
                      >
                        Quote / assign
                      </Link>
                    </div>
                  </li>
                ))}
                {!jobs.length && (
                  <li className="logistics-empty">
                    No pending jobs with map coordinates right now.
                  </li>
                )}
                {jobs.length > 4 ? (
                  <li className="log-owner-dash__more">
                    <Link to="/logistics/owner/opportunities">
                      +{jobs.length - 4} more — View all
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>
          </div>
        </div>
      )}
    </LogisticsPageShell>
  );
}
