import { useEffect, useMemo, useState } from "react";
import Modal from "react-bootstrap/Modal";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Loader from "../CommanComponents/Loader";
import SimbaWindowPager from "../CommanComponents/SimbaWindowPager";
import MapComponent from "../CommanComponents/MapComponent";
import {
  avatarColor,
  formatPrice,
  isVerified,
  providerDisplayName,
  providerInitials,
  providerLocation,
  renderStars,
} from "../utils/landingUtils";

const PAGE_LIMIT = 9;

function parseNearbyProviderResponse(res) {
  const root = res?.data ?? res ?? {};
  const list = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root)
    ? root
    : [];
  const totalCount = Number(root?.totalCount ?? list.length) || 0;
  const computedPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT) || 1);
  const apiPages = Number(root?.totalPages) || 1;
  const totalPages = Math.max(apiPages, computedPages);
  return { list, totalCount, totalPages };
}

function formatDistance(meters) {
  if (meters == null || Number.isNaN(Number(meters))) return null;
  const km = Number(meters) / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(Number(meters))} m`;
}

function getProviderId(rawProvider) {
  if (!rawProvider || rawProvider === "undefined") return null;
  if (typeof rawProvider === "string") return rawProvider;
  return rawProvider?._id || null;
}

function mapProviderRow(ele, categoryName) {
  const provider =
    ele?.serviceProviderId && typeof ele.serviceProviderId === "object"
      ? ele.serviceProviderId
      : {};
  const providerId = getProviderId(ele?.serviceProviderId);
  const services = Array.isArray(ele?.services) ? ele.services : [];
  const primary = services[0] || {};
  const skills = services
    .map((s) => s?.serviceSubCategoryName)
    .filter(Boolean)
    .slice(0, 4);

  return {
    key: providerId || ele?._id,
    providerId,
    serviceId: primary?._id,
    serviceProvider: provider,
    role:
      provider?.identity_name ||
      primary?.serviceSubCategoryName ||
      categoryName ||
      "Service provider",
    averageRating: Number(ele?.averageRating) || 0,
    reviewCount: Number(ele?.reviewCount) || 0,
    rate: primary?.price,
    skills,
    location: providerLocation(provider),
    distance: formatDistance(ele?.distance),
    completedCount: ele?.completedCount || 0,
    verified: isVerified(provider),
    coordinates: provider?.location?.coordinates,
    address:
      provider?.street_address ||
      provider?.suburbs ||
      provider?.address ||
      providerLocation(provider),
    raw: ele,
  };
}

function NearbyProviderCard({ item, onMap, onMessage, onProfileClick }) {
  const name = providerDisplayName(item.serviceProvider);
  const color = avatarColor(name);
  const profilePath = item.providerId
    ? item.serviceId
      ? `/service-provider/${item.providerId}?serviceId=${item.serviceId}`
      : `/service-provider/${item.providerId}`
    : null;

  return (
    <div className="prov-card">
      <div className="prov-top">
        <div
          className="avatar"
          style={{ background: `linear-gradient(145deg,${color},${color}cc)` }}
        >
          {providerInitials(name)}
        </div>
        <div className="prov-id">
          <h4>
            {name}
            {item.verified && (
              <span className="verified" title="Verified">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m20 6-11 11-5-5" />
                </svg>
              </span>
            )}
          </h4>
          <div className="role">{item.role}</div>
          <div className="loc">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {item.location}
            {item.distance ? ` · ${item.distance}` : ""}
          </div>
        </div>
      </div>

      <div className="prov-meta">
        <div className="rating">
          <span className="stars">{renderStars(item.averageRating)}</span>
          {item.averageRating.toFixed(1)}
          <span className="rev">({item.reviewCount})</span>
        </div>
        <span className="chip-rate">{formatPrice(item.rate)}</span>
      </div>

      {item.skills.length > 0 && (
        <div className="prov-skills">
          {item.skills.map((skill) => (
            <span key={skill} className="skill">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="prov-foot nearby-prov-foot">
        <span className="status">
          <span className="dot" />
          {item.completedCount > 0
            ? `${item.completedCount} jobs completed`
            : item.distance
            ? `${item.distance} away`
            : "Nearby"}
        </span>
        <div className="nearby-prov-actions">
          <button
            type="button"
            className="nearby-icon-btn"
            aria-label="Message provider"
            onClick={() => onMessage(item.providerId)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
            </svg>
          </button>
          {item.coordinates && (
            <button
              type="button"
              className="nearby-icon-btn"
              aria-label="View on map"
              onClick={() =>
                onMap({
                  coordinates: item.coordinates,
                  address: item.address || name,
                })
              }
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </button>
          )}
          {profilePath && (
            <Link
              to={profilePath}
              className="view-btn"
              onClick={() => onProfileClick?.(item.providerId)}
            >
              View profile
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NearByServiceProviderDetail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryName, setCategoryName] = useState(
    location.state?.categoryName || ""
  );
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapData, setMapData] = useState({ coordinates: null, address: "" });

  const searchParams = new URLSearchParams(location.search);
  const categoryId = searchParams.get("categoryId");
  const token = localStorage.getItem("token");
  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!categoryId || categoryName) return;
    dispatch(
      CustomerActions.getSubCategoryById({
        categoryId,
        page: 1,
        limit: 1,
      })
    )
      .unwrap()
      .then((res) => {
        const data = res?.data || res;
        if (data?.category?.service_category_name) {
          setCategoryName(data.category.service_category_name);
        }
      })
      .catch(() => {});
  }, [categoryId, categoryName, dispatch]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const payload = { page, limit: PAGE_LIMIT };
        if (lat) payload.lat = lat;
        if (long) payload.long = long;
        if (categoryId) payload.categoryId = categoryId;

        const res = await dispatch(
          CustomerActions.getNearbyServiceProvider(payload)
        ).unwrap();

        const { list, totalCount, totalPages: pages } =
          parseNearbyProviderResponse(res);
        setProviders(list);
        setTotalPages(pages);
        setTotalCount(totalCount);
      } catch (error) {
        console.error("Error fetching nearby service providers:", error);
        setProviders([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, categoryId, lat, long, page]);

  const displayName = categoryName || "Nearby Providers";

  const cards = useMemo(
    () => providers.map((row) => mapProviderRow(row, displayName)),
    [providers, displayName]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((item) => {
      const name = providerDisplayName(item.serviceProvider).toLowerCase();
      const role = (item.role || "").toLowerCase();
      const skills = item.skills.join(" ").toLowerCase();
      return name.includes(q) || role.includes(q) || skills.includes(q);
    });
  }, [cards, debouncedSearch]);

  const handleProfileClick = (providerId) => {
    if (!providerId || !categoryId) return;
    dispatch(
      CustomerActions.logProviderEvent({
        provider_id: providerId,
        serviceCategoryId: categoryId,
        source: "profile",
      })
    ).catch(() => {});
  };

  const handleMessage = (providerId) => {
    if (!providerId) return;
    if (!token) {
      navigate("/login");
      return;
    }
    localStorage.setItem("reciverID", providerId);
    navigate(`/messages?userID=${providerId}`);
  };

  const emptyMessage = useMemo(() => {
    if (!lat || !long) {
      return "Enable location to find providers near you.";
    }
    if (debouncedSearch.trim()) {
      return `No providers match "${debouncedSearch.trim()}".`;
    }
    return "No providers found in this category near your location.";
  }, [lat, long, debouncedSearch]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-search p-nearbyservices p-nearbyproviderlist p-serviceproviders">
        <section className="nearby-hero">
          <div className="blob a" aria-hidden="true" />
          <div className="wrap">
            <div className="crumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <Link to="/near-by-services">Nearby Providers</Link>
              <span>/</span>
              <span className="here">{displayName}</span>
            </div>
            <h1>{displayName}</h1>
            <p className="sub">
              Verified professionals near you in this category.
            </p>
          </div>
        </section>

        <section className="listing nearby-provider-listing">
          <div className="wrap">
            <div className="results-top nearby-results-top">
              <div className="svc-search-row nearby-toolbar">
                <div className="svc-search">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4-4" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search providers..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <p className="nearby-count results-count">
                <b>{debouncedSearch.trim() ? filtered.length : totalCount}</b>{" "}
                {debouncedSearch.trim() ? "results" : "providers nearby"}
              </p>
            </div>

            {loading ? (
              <div className="svc-loading">
                <Loader />
              </div>
            ) : filtered.length === 0 ? (
              <div className="svc-empty">
                <p>{emptyMessage}</p>
                <Link to="/near-by-services" className="btn btn-primary nearby-loc-btn">
                  Back to categories
                </Link>
              </div>
            ) : (
              <>
                <div className="prov-grid">
                  {filtered.map((item) => (
                    <NearbyProviderCard
                      key={item.key}
                      item={item}
                      onMap={(data) => {
                        setMapData(data);
                        setShowMapModal(true);
                      }}
                      onMessage={handleMessage}
                      onProfileClick={handleProfileClick}
                    />
                  ))}
                </div>

                {!debouncedSearch.trim() && (
                  <SimbaWindowPager
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <Modal
        show={showMapModal}
        onHide={() => setShowMapModal(false)}
        centered
        size="lg"
        className="simba-book-loc-modal"
      >
        <Modal.Header closeButton className="bk-modal-head">
          <Modal.Title>Provider location</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MapComponent
            coordinates={mapData.coordinates}
            address={mapData.address}
          />
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
