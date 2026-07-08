import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import {
  avatarColor,
  displayField,
  formatProviderPhone,
  handleProviderAvatarError,
  providerDisplayName,
  providerInitials,
  providerRoleLabel,
  userImageUrl,
  verificationPillClass,
  verificationLabel,
} from "../utils/landingUtils";
import {
  messagesPath,
  normalizeMongoId,
  persistReceiverId,
} from "../utils/normalizeMongoId";

function VerificationRow({ label, verified }) {
  return (
    <p className="sp-cat-verif-row">
      <strong>{label}:</strong>
      <span className={verificationPillClass(verified)}>
        {verificationLabel(verified)}
      </span>
    </p>
  );
}

function DetailShimmer() {
  return (
    <div className="sp-cat-detail-shimmer" aria-busy="true" aria-label="Loading provider details">
      <div className="sp-cat-hero-card">
        <div className="sp-cat-shimmer-avatar shimmer" />
        <div className="sp-cat-shimmer-hero-info">
          <div className="sp-cat-shimmer-line shimmer title" />
          <div className="sp-cat-shimmer-line shimmer subtitle" />
          <div className="sp-cat-shimmer-btn shimmer" />
        </div>
      </div>

      <Row className="sp-cat-info-grid g-4">
        {[0, 1, 2].map((col) => (
          <Col md={4} key={col}>
            <div className="sp-cat-shimmer-line shimmer section-title" />
            <div className="sp-cat-info-card">
              <div className="sp-cat-shimmer-line shimmer" />
              <div className="sp-cat-shimmer-line shimmer" />
              <div className="sp-cat-shimmer-line shimmer short" />
              {col === 1 && (
                <>
                  <div className="sp-cat-shimmer-line shimmer" />
                  <div className="sp-cat-shimmer-line shimmer short" />
                </>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default function ServiceProCategoryDetail() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: routeId } = useParams();
  const id = normalizeMongoId(routeId);

  const [loading, setLoading] = useState(true);
  const [categoryDetail, setCategoryDetail] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setCategoryDetail(null);
      setError(true);
      return;
    }

    let cancelled = false;

    const fetchDetail = async () => {
      setLoading(true);
      setError(false);
      setCategoryDetail(null);
      try {
        const result = await dispatch(
          ServiceActions.getServiceCategoryDetailId({ id })
        ).unwrap();

        if (cancelled) return;

        const detail =
          result?.serviceProviderId != null
            ? result
            : result?.data?.serviceProviderId != null
            ? result.data
            : null;

        setCategoryDetail(detail);
        if (!detail) setError(true);
      } catch (_) {
        if (!cancelled) {
          setCategoryDetail(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [dispatch, id]);

  const sp = categoryDetail?.serviceProviderId;
  const displayName = providerDisplayName(sp) || sp?.full_name || "N/A";
  const roleLabel = providerRoleLabel(sp);
  const profileSrc = userImageUrl(sp);
  const hasProfileImage = Boolean(
    sp?.profile_image && sp.profile_image !== "undefined"
  );
  const avatarBg = avatarColor(displayName);

  const handleChat = () => {
    if (!sp?._id) return;
    navigate(messagesPath(sp._id));
    persistReceiverId(sp._id);
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-sp-category-detail">
        <section className="sp-cat-detail-page">
          <Container>
            {loading ? (
              <DetailShimmer />
            ) : error || !sp ? (
              <p className="sp-cat-empty">
                Provider details could not be loaded. Please try again.
              </p>
            ) : (
              <>
                <div className="sp-cat-hero-card">
                  <div
                    className="sp-cat-hero-avatar"
                    style={{
                      background: hasProfileImage
                        ? "var(--primary-soft)"
                        : `linear-gradient(145deg,${avatarBg},${avatarBg}cc)`,
                    }}
                  >
                    {hasProfileImage ? (
                      <img
                        src={profileSrc}
                        alt={displayName}
                        onError={(e) =>
                          handleProviderAvatarError(
                            e,
                            providerInitials(displayName)
                          )
                        }
                      />
                    ) : (
                      <span className="sp-cat-hero-initials">
                        {providerInitials(displayName)}
                      </span>
                    )}
                  </div>
                  <div className="sp-cat-hero-info">
                    <h1>{displayName}</h1>
                    <p>{roleLabel}</p>
                    <button
                      type="button"
                      className="btn btn-primary sp-cat-chat-btn"
                      onClick={handleChat}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                      </svg>
                      Chat
                    </button>
                  </div>
                </div>

                <Row className="sp-cat-info-grid g-4">
                  <Col md={4}>
                    <h2 className="sp-cat-info-title">Contact Information</h2>
                    <div className="sp-cat-info-card">
                      <p>
                        <strong>Email:</strong> {displayField(sp?.email)}
                      </p>
                      <p>
                        <strong>Phone:</strong> {formatProviderPhone(sp)}
                      </p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <h2 className="sp-cat-info-title">Address</h2>
                    <div className="sp-cat-info-card">
                      <p>
                        <strong>Street:</strong>{" "}
                        {displayField(sp?.street_address)}
                      </p>
                      <p>
                        <strong>House:</strong> {displayField(sp?.house_number)}
                      </p>
                      <p>
                        <strong>Suburb:</strong> {displayField(sp?.suburbs)}
                      </p>
                      <p>
                        <strong>Post Code:</strong> {displayField(sp?.post_code)}
                      </p>
                      <p>
                        <strong>Country:</strong> {displayField(sp?.country)}
                      </p>
                    </div>
                  </Col>
                  <Col md={4}>
                    <h2 className="sp-cat-info-title">Verification Status</h2>
                    <div className="sp-cat-info-card">
                      <VerificationRow
                        label="Account Verified"
                        verified={sp?.account_verified}
                      />
                      <VerificationRow
                        label="Email Verified"
                        verified={sp?.email_verified}
                      />
                      <VerificationRow
                        label="Phone Verified"
                        verified={sp?.phone_verified}
                      />
                    </div>
                  </Col>
                </Row>
              </>
            )}
          </Container>
        </section>
      </div>
    </Layout>
  );
}
