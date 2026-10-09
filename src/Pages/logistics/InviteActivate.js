import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import LogisticsActions from "../../Redux/Actions/LogisticsActions";
import ButtonLoader from "../../CommanComponents/ButtonLoader";
import { persistUserId } from "../../utils/normalizeMongoId";
import "./logistics.css";

const AUTH_VISUAL_IMG =
  "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=80";

function LockIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.9 4.2A9.5 9.5 0 0 1 12 4c6.5 0 10 7 10 7a13 13 0 0 1-2.2 3M6.6 6.6A13 13 0 0 0 2 11s3.5 7 10 7a9.5 9.5 0 0 0 4.2-.9M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export default function LogisticsInviteActivate() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get("token") || pathToken || "").trim();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setInfo(null);
        setError("Missing invite token. Use /logistics/invite?token=…");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await dispatch(LogisticsActions.verifyInvite(token));
        const data = res?.payload?.data;
        if (cancelled) return;
        if (res?.payload?.success && data?.valid) {
          setInfo(data);
          setError("");
        } else {
          setInfo(null);
          setError(
            res?.payload?.message ||
              (res?.meta?.requestStatus === "rejected"
                ? "Could not verify invite (network error)."
                : "Invite invalid or expired")
          );
        }
      } catch (err) {
        if (!cancelled) {
          setInfo(null);
          setError(err?.message || "Could not verify invite");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  const activate = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      const res = await dispatch(
        LogisticsActions.activateInvite({ token, password })
      );
      if (res?.payload?.success) {
        const data = res.payload.data;
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", String(data.user.role));
        persistUserId(data.user._id);
        if (data.user.owner_id) {
          localStorage.setItem("owner_id", String(data.user.owner_id));
        } else {
          localStorage.removeItem("owner_id");
        }
        localStorage.setItem(
          "logisticsPermissions",
          JSON.stringify(data.user.permissions || [])
        );
        localStorage.setItem("activeModule", "logistics");
        localStorage.setItem(
          "isSubscribed",
          Number(data.user.isSubscribed) === 1 || data.user.isSubscribed === true
            ? "1"
            : "0"
        );
        if (data.user.subscription_holder) {
          localStorage.setItem(
            "logisticsSubscriptionHolder",
            String(data.user.subscription_holder)
          );
        }
        toast.success("Account activated");
        navigate("/logistics/driver");
      } else {
        toast.error(res?.payload?.message || "Activation failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = useMemo(
    () => "Operator",
    [info?.sub_user_type]
  );

  const company = info?.business_name || "your company";
  const headTitle = loading
    ? "Checking invite…"
    : info?.valid
      ? `Join as ${roleLabel.toLowerCase()}`
      : "Invite unavailable";

  const headLead = loading
    ? "Please wait while we verify your invite link."
    : info?.valid
      ? `Set your password to join ${company} on Simba Tasker Logistics.`
      : error || "This invite link is invalid or has expired.";

  return (
    <div className="simba-marketing-layout">
      <div className="simba-page p-signup p-login p-logistics-invite">
        <div className="auth">
          <div className="auth-visual">
            <img
              src={AUTH_VISUAL_IMG}
              alt="Logistics fleet and operators at work"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="av-grain" />
            <div className="av-content">
              <div className="av-top" />
              <div className="av-bottom">
                <p className="log-invite-kicker">Simba Tasker · Logistics</p>
                <h2>
                  You&apos;re invited to operate with{" "}
                  <span className="hl">{company}</span>
                </h2>
                <p>
                  Activate your account, set a password only you know, then start
                  taking assigned jobs on trucks and plant.
                </p>
                <div className="av-stats">
                  <div>
                    <b>Invite-only</b>
                    <span>No self-signup</span>
                  </div>
                  <div>
                    <b>Secure</b>
                    <span>You set the password</span>
                  </div>
                  <div>
                    <b>Fleet</b>
                    <span>Trucks &amp; plant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-form">
            <div className="fcard">
              <Link to="/login" className="brand">
                <img
                  src={require("../../Assets/Images/dark-logo.png")}
                  alt="Simba Tasker"
                />
                <span className="brand-module">Logistics</span>
              </Link>

              <div className="form-head">
                <h1>{headTitle}</h1>
                <p>{headLead}</p>
              </div>

              {loading ? (
                <div className="log-invite-status">
                  <ButtonLoader />
                  <span>Verifying invite…</span>
                </div>
              ) : info?.valid ? (
                <>
                  <div className="log-invite-meta">
                    {info.full_name ? (
                      <div className="log-invite-meta__row">
                        <span className="log-fl">Name</span>
                        <strong>{info.full_name}</strong>
                      </div>
                    ) : null}
                    {info.phone_number ? (
                      <div className="log-invite-meta__row">
                        <span className="log-fl">Phone</span>
                        <strong>
                          {[info.country_code, info.phone_number].filter(Boolean).join(" ")}
                        </strong>
                      </div>
                    ) : null}
                    {info.email ? (
                      <div className="log-invite-meta__row">
                        <span className="log-fl">Account email</span>
                        <strong>{info.email}</strong>
                      </div>
                    ) : null}
                    {info.asset_name ? (
                      <div className="log-invite-meta__row">
                        <span className="log-fl">Equipment</span>
                        <strong>{info.asset_name}</strong>
                      </div>
                    ) : null}
                    <div className="log-invite-meta__row">
                      <span className="log-fl">Role</span>
                      <strong>{roleLabel}</strong>
                    </div>
                    {info.expires_at ? (
                      <div className="log-invite-meta__row">
                        <span className="log-fl">Invite valid until</span>
                        <strong>{new Date(info.expires_at).toLocaleDateString()}</strong>
                      </div>
                    ) : null}
                  </div>
                  <p className="log-hint">
                    Your company entered these details. You can change your name
                    and phone later in your profile.
                  </p>

                  <form onSubmit={activate} noValidate>
                    <div className="field">
                      <label htmlFor="invite-password">Set password</label>
                      <div className="input-shell">
                        <LockIcon />
                        <input
                          id="invite-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="toggle-eye"
                          aria-label="Toggle password visibility"
                          onClick={() => setShowPassword((v) => !v)}
                        >
                          {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                        </button>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="invite-password-confirm">Confirm password</label>
                      <div className="input-shell">
                        <LockIcon />
                        <input
                          id="invite-password-confirm"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Type it again"
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                      </div>
                      {confirmPassword && confirmPassword !== password ? (
                        <p className="log-hint" style={{ color: "#8a3b3b" }}>
                          Passwords don&apos;t match
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-block"
                      disabled={saving || password.length < 6 || password !== confirmPassword}
                    >
                      {saving ? <ButtonLoader /> : "Activate account"}
                      {!saving ? (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      ) : null}
                    </button>
                  </form>
                </>
              ) : (
                <div className="log-invite-error">
                  <p>{error || "Invite invalid or expired"}</p>
                  <p className="log-hint">
                    Ask the company that invited you to tap <b>Resend</b> on their
                    Operators page — you&apos;ll get a new link valid for 7 days.
                  </p>
                  <Link to="/login" className="logistics-cta logistics-cta--primary">
                    Go to login
                  </Link>
                </div>
              )}

              <p className="log-invite-foot">
                Already activated? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
