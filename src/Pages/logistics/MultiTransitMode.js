import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import LogisticsPageShell from "../../CommanComponents/LogisticsPageShell";
import MultiTransitMap from "../../CommanComponents/MultiTransitMap";
import { placeShortLabel } from "../../CommanComponents/LogisticsJobRoutePanel";
import {
  buildNearestMultiTransitRoute,
  enrichPlanWithRoadRoute,
  multiStopMapsUrl,
} from "../../utils/multiTransitRoute";
import "./logistics.css";
import {
  LogisticsDetailSkeleton,
} from "../../CommanComponents/LogisticsSkeleton";

const STATUS_LABEL = {
  1: "Accepted",
  2: "Collect",
  3: "Loaded",
  4: "Transit",
  5: "Done",
  6: "Cancelled",
  7: "Rejected",
};

const NEXT_ACTION = {
  1: { status: 2, label: "Start collect" },
  2: { status: 3, label: "Mark loaded" },
  3: { status: 4, label: "Start transit" },
  4: { status: 5, label: "Confirm delivered" },
};

const EMPTY_JOBS = [];

function routeLabel(job) {
  const pickup = placeShortLabel(job?.pickup?.address) || "Pickup";
  const dropoff = placeShortLabel(job?.dropoff?.address) || "Dropoff";
  return `${pickup} → ${dropoff}`;
}

function mapsDirectionsUrl(job) {
  const p = job?.pickup?.coordinates;
  const d = job?.dropoff?.coordinates;
  if (!Array.isArray(p) || p.length < 2 || !Array.isArray(d) || d.length < 2) {
    return null;
  }
  const origin = `${p[1]},${p[0]}`;
  const dest = `${d[1]},${d[0]}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

/**
 * Operator multi-transit mode — nearest-stop common route from truck GPS.
 */
export default function MultiTransitMode() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [focusJobId, setFocusJobId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [eligible, setEligible] = useState([]);
  const [addId, setAddId] = useState("");
  const [truckLocation, setTruckLocation] = useState(null);
  const [truckAvailability, setTruckAvailability] = useState("on_job");

  const reload = async () => {
    setLoading(true);
    try {
      const [res, dash] = await Promise.all([
        dispatch(LogisticsActions.getMultiTransit(id)),
        dispatch(LogisticsActions.getOperatorDashboard()),
      ]);
      if (res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not load multi-transit");
        navigate("/logistics/driver/jobs", { replace: true });
        return;
      }
      const payload = res?.payload?.data;
      if (payload?.dissolved || payload?.status === "closed") {
        toast.info("Multi-transit closed");
        navigate("/logistics/driver/jobs", { replace: true });
        return;
      }
      setData(payload);
      const av = dash?.payload?.data?.availability || {};
      const lat = Number(av.lat);
      const lng = Number(av.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setTruckLocation({ lat, lng });
      } else {
        setTruckLocation(null);
      }
      setTruckAvailability(av.ui_state || av.state || "on_job");
      const el = await dispatch(LogisticsActions.listMultiTransitEligible());
      setEligible(el?.payload?.data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dispatch]);

  const jobs = data?.jobs || EMPTY_JOBS;
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!needle) return jobs;
    return jobs.filter((j) => {
      const hay = [
        j.job_number,
        j._id,
        j.load_type,
        j.pickup?.address,
        j.dropoff?.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, "");
      return hay.includes(needle);
    });
  }, [jobs, q]);

  const mapJobs = filtered.length && q.trim() ? filtered : jobs;
  const baseRoutePlan = useMemo(
    () => buildNearestMultiTransitRoute(mapJobs, truckLocation),
    [mapJobs, truckLocation]
  );
  const [routePlan, setRoutePlan] = useState(baseRoutePlan);
  const [roadRouting, setRoadRouting] = useState(
    () => Boolean(baseRoutePlan?.stops?.length)
  );

  useEffect(() => {
    let cancelled = false;
    setRoutePlan(baseRoutePlan);
    if (!baseRoutePlan?.stops?.length) {
      setRoadRouting(false);
      return undefined;
    }
    setRoadRouting(true);
    enrichPlanWithRoadRoute(baseRoutePlan)
      .then((enriched) => {
        if (cancelled) return;
        setRoutePlan(enriched);
        setRoadRouting(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRoutePlan({
          ...baseRoutePlan,
          roadPath: null,
          distanceSource: "straight_line",
        });
        setRoadRouting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [baseRoutePlan]);

  const commonMapsUrl = useMemo(
    () => multiStopMapsUrl(routePlan.origin, routePlan.stops),
    [routePlan]
  );

  const advanceJob = async (job) => {
    const next = NEXT_ACTION[Number(job.status)];
    if (!next) return;
    if (next.status === 5) {
      navigate(`/logistics/driver/job/${job._id}`);
      return;
    }
    setBusyId(job._id);
    try {
      const res = await dispatch(
        LogisticsActions.updateJobStatus({
          jobId: job._id,
          status: next.status,
        })
      );
      if (
        res?.payload?.success === false ||
        res?.meta?.requestStatus === "rejected"
      ) {
        toast.error(res?.payload?.message || "Could not update status");
        return;
      }
      toast.success(STATUS_LABEL[next.status] || "Status updated");
      await reload();
    } finally {
      setBusyId("");
    }
  };

  const removeJob = async (jobId) => {
    setBusyId(jobId);
    try {
      const res = await dispatch(
        LogisticsActions.removeMultiTransitJob({ id, jobId })
      );
      if (res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not remove job");
        return;
      }
      if (res?.payload?.data?.dissolved) {
        toast.info("Multi-transit closed — fewer than 2 jobs left");
        navigate("/logistics/driver/jobs", { replace: true });
        return;
      }
      toast.success("Removed from multi-transit");
      await reload();
    } finally {
      setBusyId("");
    }
  };

  const addJob = async () => {
    if (!addId) {
      toast.error("Pick an Accepted job to add");
      return;
    }
    setBusyId("add");
    try {
      const res = await dispatch(
        LogisticsActions.addMultiTransitJob({ id, job_id: addId })
      );
      if (res?.meta?.requestStatus === "rejected") {
        toast.error(res?.payload?.message || "Could not add job");
        return;
      }
      toast.success("Job added to multi-transit");
      setAddId("");
      await reload();
    } finally {
      setBusyId("");
    }
  };

  return (
    <LogisticsPageShell
      title="Multi-transit mode"
      crumbLabel="Multi-transit"
      midCrumb={{ to: "/logistics/driver/jobs", label: "My Jobs" }}
      homeTo="/logistics/driver"
    >
      <div className="log-mt-page">
        <p className="log-op-lead" style={{ marginTop: 0 }}>
          Suggested route always starts from your truck GPS, then the{" "}
          <strong>nearest open pickup or dropoff</strong> (a job’s drop only
          unlocks after its pickup). Red package = pick · green package = drop ·
          faded = already done.
        </p>

        {loading && !data ? (
          <LogisticsDetailSkeleton media={false} label="Loading multi-transit" />
        ) : (
          <>
            <div className="log-mt-toolbar log-jobs-toolbar log-jobs-toolbar--wrap">
              <label className="log-jobs-toolbar__search">
                <span className="log-fl">Job # search</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Unique job number…"
                />
              </label>
              <label>
                <span className="log-fl">Add Accepted job</span>
                <select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  disabled={!eligible.length}
                >
                  <option value="">
                    {eligible.length ? "Select job…" : "No eligible jobs"}
                  </option>
                  {eligible.map((j) => (
                    <option key={j._id} value={j._id}>
                      {(j.job_number || j._id).toString()} ·{" "}
                      {j.load_type || "Job"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="log-jobs-toolbar__actions">
                <button
                  type="button"
                  className="logistics-cta logistics-cta--primary"
                  disabled={!addId || busyId === "add"}
                  onClick={addJob}
                >
                  Add to run
                </button>
                {commonMapsUrl ? (
                  <a
                    className="logistics-cta logistics-cta--ghost"
                    href={commonMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open common route
                  </a>
                ) : null}
                <Link
                  className="logistics-cta logistics-cta--ghost"
                  to="/logistics/driver/jobs"
                >
                  Back to My Jobs
                </Link>
              </div>
            </div>

            {!truckLocation ? (
              <p className="log-mt-gps-warn">
                No truck GPS yet — suggested order may start from the first
                stop.{" "}
                <Link to="/logistics/driver">Verify GPS on Dashboard</Link> for
                a nearest-stop route from your live position.
              </p>
            ) : null}

            <section className="log-mt-map-wrap">
              <div className="log-mt-map-head">
                <h2>Suggested common route</h2>
                <span>
                  {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
                  {routePlan.stops.length} open stop
                  {routePlan.stops.length === 1 ? "" : "s"}
                  {routePlan.totalKm
                    ? ` · ~${routePlan.totalKm} km`
                    : ""}
                  {roadRouting
                    ? " · routing…"
                    : routePlan.distanceSource === "google" ||
                        routePlan.distanceSource === "osrm"
                      ? " · road route"
                      : routePlan.distanceSource === "straight_line"
                        ? " · approx (no roads)"
                        : ""}{" "}
                  · red = pick · green = drop · faded = done
                </span>
              </div>
              {roadRouting ? (
                <div
                  className="log-mt-map"
                  style={{
                    height: 520,
                    display: "grid",
                    placeItems: "center",
                    background: "#eef2f0",
                    color: "#3d4a44",
                  }}
                  aria-busy="true"
                >
                  Loading road route…
                </div>
              ) : (
                <MultiTransitMap
                  jobs={mapJobs}
                  focusJobId={focusJobId}
                  truckLocation={truckLocation}
                  truckAvailability={truckAvailability}
                  routePlan={routePlan}
                  height={520}
                />
              )}
            </section>

            {routePlan.stops.length ? (
              <>
                <h2 className="log-sect">Stop order (nearest first)</h2>
                <ol className="log-mt-stop-list">
                  {routePlan.stops.map((stop) => (
                    <li key={stop.key}>
                      <button
                        type="button"
                        className="log-mt-stop-card"
                        onClick={() => setFocusJobId(stop.jobId)}
                      >
                        <span className="log-mt-stop-card__n">{stop.step}</span>
                        <span>
                          <b>
                            {stop.kind === "pickup" ? "Pick" : "Drop"} ·{" "}
                            {stop.label}
                          </b>
                          <small>
                            {placeShortLabel(stop.address) || stop.address || "—"}
                            {stop.distance_from_prev_km != null
                              ? ` · ${stop.distance_from_prev_km} km from previous`
                              : ""}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}

            <h2 className="log-sect">Tasks in this multi-transit</h2>
            <div className="log-jobs-table-wrap">
              <table className="log-jobs-table log-mt-table">
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Directions</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((job) => {
                    const next = NEXT_ACTION[Number(job.status)];
                    const dir = mapsDirectionsUrl(job);
                    const busy = busyId === job._id;
                    return (
                      <tr
                        key={job._id}
                        className={
                          focusJobId === String(job._id) ? "is-focused" : ""
                        }
                        onClick={() => setFocusJobId(String(job._id))}
                      >
                        <td>
                          <b>{job.job_number || "—"}</b>
                          <div className="log-hint">
                            {job.load_type || "Transport"}
                          </div>
                        </td>
                        <td>
                          {routeLabel(job)}
                          <div className="log-hint">
                            {job.pickup?.address || "—"}
                          </div>
                        </td>
                        <td>
                          <span className="log-chip log-chip--active">
                            {STATUS_LABEL[job.status] || job.status}
                          </span>
                        </td>
                        <td>
                          {dir ? (
                            <a
                              className="log-jobs-table__link"
                              href={dir}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Job A→B
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="log-mt-actions">
                            {next ? (
                              <button
                                type="button"
                                className="logistics-cta logistics-cta--primary"
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceJob(job);
                                }}
                              >
                                {busy ? "…" : next.label}
                              </button>
                            ) : null}
                            <Link
                              className="logistics-cta logistics-cta--ghost"
                              to={`/logistics/driver/job/${job._id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Detail
                            </Link>
                            {Number(job.status) === 1 ? (
                              <button
                                type="button"
                                className="logistics-cta logistics-cta--ghost"
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeJob(job._id);
                                }}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filtered.length ? (
                    <tr>
                      <td colSpan={5} className="logistics-empty">
                        No jobs match this job number
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </LogisticsPageShell>
  );
}
