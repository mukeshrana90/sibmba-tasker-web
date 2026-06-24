import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CorporatePageShell from "../../CommanComponents/CorporatePageShell";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import Loader from "../../CommanComponents/Loader";
import ChatIcon from "../../Assets/Images/chat.svg";
import mapIcon from "../../Assets/Images/map.svg";
import MapComponent from "../../CommanComponents/MapComponent";
import { setCustomer } from "../../Redux/Reducers/LoginSlice";
import {
  handleUserImageError,
  userImageUrl,
  formatDisplayTitle,
  providerDisplayName,
  avatarColor,
  providerInitials,
} from "../../utils/landingUtils";
import facebookLogo from "../../Assets/Images/facebook.svg";
import instagramLogo from "../../Assets/Images/instagram.svg";
import link from "../../Assets/Images/link.png";

function safeVal(value) {
  if (value == null || value === "" || value === "undefined" || value === "null") {
    return null;
  }
  return String(value).trim() || null;
}

function InfoRow({ label, value }) {
  return (
    <div className="corp-info-row">
      <span>{label}</span>
      <b>{value || "N/A"}</b>
    </div>
  );
}

export default function CorporateBusinessPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showMapModal, setShowMapModal] = useState(false);
  const [page] = useState(1);
  const [limit] = useState(10);
  const [leadFilter] = useState("all");
  const [searchText] = useState("");
  const { id: userId } = useParams();
  const [packageDetails, setPackageDetails] = useState("");
  const [corpoProfile, setCorpoProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const data = useSelector((state) => state.service?.corpoProUserDetail);

  useEffect(() => {
    const fetchCorporateInfo = async () => {
      setLoading(true);
      try {
        const response = await dispatch(
          CustomerActions.corpoProUserDetail({ userId })
        );
        if (response?.payload) {
          setCorpoProfile(response.payload?.data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchCorporateInfo();
    }
    getProfileApiCall();
  }, [dispatch, userId, page, limit, leadFilter, searchText]);

  const getProfileApiCall = async () => {
    try {
      const apiRes = await dispatch(
        CustomerActions.getProfileWithSuscription()
      );
      if (apiRes?.payload?.success) {
        dispatch(setCustomer(apiRes?.payload?.data.user));
      }
      setPackageDetails(apiRes?.payload?.data?.subscriptionDetail);
    } catch (error) {
      console.error("Subscription check failed:", error);
    }
  };

  const isSubscriptionExpired = (user) => {
    const subscription = user?.subscriptionDetail;
    const currentDate = new Date();

    if (!subscription || Object.keys(subscription).length === 0) {
      const createdAt = new Date(user?.user?.createdAt);
      const diffInDays = (currentDate - createdAt) / (1000 * 60 * 60 * 24);
      return diffInDays >= 90;
    }

    const endDate = new Date(subscription.endDate);
    if (subscription.status === "inactive" && currentDate > endDate) {
      return true;
    }
    return endDate < currentDate;
  };

  const profile = data || corpoProfile;
  const displayName = providerDisplayName(profile);
  const categoryName = formatDisplayTitle(
    profile?.corporateCategoryId?.name,
    "Corporate Category"
  );
  const street = [safeVal(profile?.house_number), safeVal(profile?.street_address)]
    .filter(Boolean)
    .join(", ");
  const hasProfileImage = Boolean(safeVal(profile?.profile_image));

  const handleChat = () => {
    if (isSubscriptionExpired(packageDetails)) {
      setShowPlanModal(true);
      return;
    }
    navigate(`/messages?userID=${profile?._id}`);
    localStorage.setItem("reciverID", profile._id);
  };

  const handleCall = (e) => {
    if (isSubscriptionExpired(packageDetails)) {
      e.preventDefault();
      setShowPlanModal(true);
    }
  };

  const handleMap = () => {
    if (isSubscriptionExpired(packageDetails)) {
      setShowPlanModal(true);
      return;
    }
    setShowMapModal(true);
  };

  return (
    <CorporatePageShell
      title={displayName}
      crumbLabel="Corporate Pro"
      pageClass="p-corporate-portal p-corporate p-corp-profile"
    >
      <div className="corp-profile-topbar mb-3">
        <button type="button" className="corp-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {loading ? (
        <div className="corp-profile-loading">
          <Loader />
        </div>
      ) : profile ? (
        <div className="card reveal in corp-business-card">
          <h2 className="corp-business-card__title">Business Details</h2>
          <p className="lead">{categoryName}</p>

          <div className="corp-detail-layout">
            <div className="corp-detail-photo">
              {hasProfileImage ? (
                <img
                  src={userImageUrl(profile)}
                  alt={displayName}
                  onError={handleUserImageError}
                />
              ) : (
                <div
                  className="corp-detail-photo-fallback"
                  style={{
                    background: `linear-gradient(145deg,${avatarColor(displayName)},#0A4338)`,
                  }}
                >
                  {providerInitials(displayName)}
                </div>
              )}
            </div>

            <div className="corp-info-grid">
              <InfoRow label="Company name" value={displayName} />
              <InfoRow label="Profession type" value={categoryName} />
              <InfoRow label="Email" value={profile?.email} />
              <InfoRow label="Phone" value={profile?.phone_number} />
              <InfoRow label="Street address" value={street} />
              <InfoRow label="Company address" value={profile?.address} />
              <InfoRow
                label="Verified"
                value={profile?.email_verified ? "Yes" : "No"}
              />
              <InfoRow
                label="Status"
                value={profile?.status === 1 ? "Active" : "Inactive"}
              />
            </div>
          </div>

          {(profile?.facebook_link ||
            profile?.instagram_link ||
            profile?.website_link) && (
            <div className="corp-social-links">
              {profile.facebook_link && (
                <a
                  href={`//${profile.facebook_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={facebookLogo} alt="Facebook" height={28} />
                </a>
              )}
              {profile.instagram_link && (
                <a
                  href={`//${profile.instagram_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={instagramLogo} alt="Instagram" height={28} />
                </a>
              )}
              {profile.website_link && (
                <a
                  href={`//${profile.website_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={link} alt="Website" height={28} />
                </a>
              )}
            </div>
          )}

          <div className="corp-detail-actions">
            <button
              type="button"
              className="btn btn-ghost corp-action-btn"
              onClick={handleChat}
            >
              <img src={ChatIcon} alt="" width={16} height={16} />
              Direct Chat
            </button>
            <a
              href={
                !packageDetails || packageDetails?.status === "inactive"
                  ? "#"
                  : `tel:${profile.phone_number}`
              }
              onClick={handleCall}
              className="btn btn-gold corp-action-btn"
            >
              Call Now
            </a>
            <button
              type="button"
              className="btn btn-ghost corp-action-btn"
              onClick={handleMap}
            >
              <img src={mapIcon} alt="" width={16} height={16} />
              View on Map
            </button>
          </div>
        </div>
      ) : (
        <div className="corp-profile-empty">
          <h3>No Business Details Found</h3>
          <p>Currently you don&apos;t have any business details.</p>
        </div>
      )}

      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-none pb-0">
          <Modal.Title>Service Location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="comman-small-pop text-center">
            <MapComponent
              coordinates={profile?.location?.coordinates}
              address={profile?.street_address || profile?.address}
            />
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showPlanModal}
        onHide={() => setShowPlanModal(false)}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body>
          <div className="comman-small-pop">
            <h3>Upgrade Plan</h3>
            <div className="d-flex justify-content-center download-app-section mt-2">
              Please subscribe to our plan to access this feature
            </div>
            <div className="d-flex justify-content-center mt-3">
              <button
                className="primaryBtn"
                onClick={() => navigate(`/corporate/subscription-plan`)}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </CorporatePageShell>
  );
}
