import { Link } from "react-router-dom";
import { getStatusLabel } from "../../utils/CommonFunction";
import { taskStatus } from "../../utils/jobFlowStatus";
import {
  avatarColor,
  handleCategoryImageError,
  providerInitials,
} from "../../utils/landingUtils";

export function PlaceholderImageIcon({ size = 46 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

export function getServiceStatusMeta(status) {
  const s = Number(status);
  if (s === 4) return { cls: "st-completed", label: getStatusLabel(s) };
  if (s === 3 || s === 5) return { cls: "st-cancelled", label: getStatusLabel(s) };
  if ([2, 6, 7].includes(s)) {
    return { cls: "st-progress", label: getStatusLabel(s) };
  }
  return { cls: "st-upcoming", label: getStatusLabel(s) };
}

export function getTaskBookingStatusMeta(status) {
  const s = Number(status);
  if (s === taskStatus.COMPLETED) {
    return { cls: "st-completed", label: "Completed" };
  }
  if (s === taskStatus.REJECTED) {
    return { cls: "st-cancelled", label: "Rejected" };
  }
  if (
    [taskStatus.ACCEPTED, taskStatus.ON_THE_WAY, taskStatus.IN_PROGRESS].includes(
      s
    )
  ) {
    if (s === taskStatus.ON_THE_WAY) {
      return { cls: "st-progress", label: "On the Way" };
    }
    if (s === taskStatus.IN_PROGRESS) {
      return { cls: "st-progress", label: "In Progress" };
    }
    return { cls: "st-progress", label: "Accepted" };
  }
  return { cls: "st-upcoming", label: "Pending" };
}

export function BookingDetailPageShell({ isTask, headAction, children }) {
  return (
    <div className="simba-page p-taskdetails">
      <main className="page">
        <div className="wrap">
          <div className="crumbs">
            <Link to="/bookings">Bookings</Link>
            <span>/</span>
            <span style={{ color: "var(--ink)", opacity: 1 }}>
              {isTask ? "Task Details" : "Booking Details"}
            </span>
          </div>
          <div className="page-head">
            <h1>{isTask ? "Task Details" : "Booking Details"}</h1>
            {headAction}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function BookingDetailGallery({ images, getImageUrl, statusMeta }) {
  const urls = (images || []).filter(Boolean).map(getImageUrl);
  const main = urls[0] || null;
  const thumbs = urls.slice(1, 3);

  return (
    <div className={`tgallery${thumbs.length === 0 ? " tgallery--single" : ""}`}>
      <div className="big">
        <div className="tag-status">
          <span className={`status-badge ${statusMeta.cls}`}>
            <span className="sdot" />
            {statusMeta.label}
          </span>
        </div>
        {main ? (
          <img src={main} alt="" onError={handleCategoryImageError} />
        ) : (
          <PlaceholderImageIcon />
        )}
      </div>
      {thumbs.length > 0 && (
        <div className="col">
          {thumbs.map((src, i) => (
            <div key={i} className="small">
              <img src={src} alt="" onError={handleCategoryImageError} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MetaRow({ icon, label, value }) {
  return (
    <div className="meta-row">
      <span className="mi">{icon}</span>
      <div className="mtxt">
        <small>{label}</small>
        <b>{value || "N/A"}</b>
      </div>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function StatusClockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7v5l3 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function BookingInfoCard({ title, subtitle, location, scheduled, bookingId }) {
  return (
    <div className="card">
      <h2 id="taskTitle">{title || "N/A"}</h2>
      {subtitle && (
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>{subtitle}</p>
      )}
      <MetaRow icon={<LocationIcon />} label="Location" value={location} />
      <MetaRow icon={<ClockIcon />} label="Scheduled" value={scheduled} />
      {bookingId && (
        <MetaRow icon={<CalendarIcon />} label="Booking ID" value={bookingId} />
      )}
    </div>
  );
}

export function ProviderBlockCard({ provider, onMessage, showCall }) {
  if (!provider) return null;
  const name =
    provider.company_name && provider.company_name !== "undefined"
      ? provider.company_name
      : provider.full_name || "Provider";
  const email = provider.email || "";
  const color = avatarColor(name);
  const initials = providerInitials(name);

  return (
    <div className="card">
      <h2>
        <span className="hico"><UserIcon /></span>
        About Service Provider
      </h2>
      <div className="prov-block">
        <span
          className="pav"
          style={{
            background: `linear-gradient(145deg,${color},${color}99)`,
          }}
        >
          {initials}
        </span>
        <div className="pinfo">
          <b>
            {name}{" "}
            <span className="verified" title="Verified">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m20 6-11 11-5-5" />
              </svg>
            </span>
          </b>
          {email && <small>{email}</small>}
        </div>
        <div className="prov-actions">
          {onMessage && (
            <button type="button" className="icon-btn" aria-label="Message" onClick={onMessage}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
              </svg>
            </button>
          )}
          {showCall && provider.phone && (
            <a href={`tel:${provider.phone}`} className="icon-btn" aria-label="Call">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingStatusCard({
  description,
  showDoneBanner,
  scheduledLine,
  children,
}) {
  return (
    <div className="card">
      <h2>
        <span className="hico"><StatusClockIcon /></span>
        Status
      </h2>
      {description && (
        <p style={{ color: "var(--muted)", fontSize: ".92rem" }}>{description}</p>
      )}
      {children}
      {showDoneBanner && (
        <div className="done-banner">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <div>
            <b>Job done! Your payment was successful.</b>
            <p>Thank you for using Simba Tasker. We hope to see you again soon.</p>
          </div>
        </div>
      )}
      {scheduledLine && (
        <div className="sched-line">
          Scheduled for: <b>{scheduledLine}</b>
        </div>
      )}
    </div>
  );
}

export function PaymentSummaryCard({
  price,
  paid,
  children,
}) {
  const amount = price != null ? Number(price) : null;
  const fmt = (n) => (n != null && !Number.isNaN(n) ? `$${n.toFixed(2)}` : "—");

  return (
    <div className="summary">
      <h3>Payment summary</h3>
      <div className="sum-row">
        <span>Service charge</span>
        <b>{fmt(amount)}</b>
      </div>
      <div className="sum-total">
        <span>{paid ? "Total paid" : "Total"}</span>
        <b>{fmt(amount)}</b>
      </div>
      {paid && (
        <div style={{ marginTop: 12 }}>
          <span className="paid-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m20 6-11 11-5-5" />
            </svg>
            Paid
          </span>
        </div>
      )}
      {children && <div className="side-actions">{children}</div>}
    </div>
  );
}

export function NeedHelpCard({ onDispute }) {
  return (
    <div className="summary" style={{ boxShadow: "var(--shadow-sm)" }}>
      <h3>Need help?</h3>
      <p style={{ color: "var(--muted)", fontSize: ".9rem", marginBottom: 14 }}>
        Something wrong with this task? Our support team is here 24/7.
      </p>
      {onDispute ? (
        <button type="button" className="btn btn-ghost btn-block" onClick={onDispute}>
          Raise a dispute
        </button>
      ) : (
        <a href="mailto:support@simbatasker.com" className="btn btn-ghost btn-block">
          Contact support
        </a>
      )}
    </div>
  );
}

const RATING_HINTS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function SimbaFeedbackModalBody({
  thumbSrc,
  title,
  scheduleText,
  locationText,
  rating,
  onRatingChange,
  message,
  onMessageChange,
  onSubmit,
}) {
  return (
    <div className="simba-feedback-body">
      <div className="fb-task">
        <div className="fb-thumb">
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 13 }}
              onError={handleCategoryImageError}
            />
          ) : (
            <PlaceholderImageIcon size={26} />
          )}
        </div>
        <div className="ft">
          <b>{title || "—"}</b>
          {scheduleText && (
            <div className="ftrow">
              <ClockIcon />
              {scheduleText}
            </div>
          )}
          {locationText && (
            <div className="ftrow">
              <LocationIcon />
              {locationText}
            </div>
          )}
        </div>
      </div>
      <div className="fb-q">How would you rate the experience and service?</div>
      <div className="stars-pick">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= rating ? "on" : ""}
            aria-label={`${star} star`}
            onClick={() => onRatingChange(star)}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 2 2.4 7.4H22l-6 4.4 2.3 7.2-6.3-4.6-6.3 4.6L8 13.8l-6-4.4h7.6L12 2Z" />
            </svg>
          </button>
        ))}
      </div>
      <div className="rate-hint">{rating ? RATING_HINTS[rating] : ""}</div>
      <div className="fb-input">
        <textarea
          placeholder="Tell us about your experience…"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-gold btn-block" onClick={onSubmit}>
        Submit Feedback
      </button>
    </div>
  );
}

export function SimbaFeedbackThankYou({ onDone }) {
  return (
    <div className="simba-feedback-thanks">
      <div className="fb-thanks-icon" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m20 6-11 11-5-5" />
        </svg>
      </div>
      <h3>Thanks for giving your feedback</h3>
      <p>
        Your feedback means a lot for the rating and improvement of our service.
      </p>
      <button type="button" className="btn btn-gold btn-block" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
