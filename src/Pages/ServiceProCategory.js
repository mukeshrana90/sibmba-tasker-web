import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import Layout from "../Components/Layout/Layout";
import ServiceActions from "../Redux/Actions/ServiceActions";
import {
  formatDisplayTitle,
  handleCategoryImageError,
  serviceImageUrl,
} from "../utils/landingUtils";
import {
  normalizeMongoId,
  serviceProCategoryDetailPath,
} from "../utils/normalizeMongoId";
import { getAppHomePath } from "../utils/appHomePath";

function PlaceholderIcon() {
  return (
    <svg
      className="ph"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

function ServiceShimmerGrid({ count = 8 }) {
  return (
    <div className="svc-grid svc-shimmer-grid" aria-busy="true" aria-label="Loading services">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="svc-shimmer-card">
          <div className="svc-shimmer-thumb shimmer" />
          <div className="svc-shimmer-line shimmer" />
          <div className="svc-shimmer-line shimmer short" />
        </div>
      ))}
    </div>
  );
}

export default function ServiceProCategory() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id: routeId } = useParams();
  const id = normalizeMongoId(routeId);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [services, setServices] = useState([]);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setServices([]);
      return;
    }

    let cancelled = false;

    const fetchServices = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          ServiceActions.getServiceProviderByCategory({ categoryId: id })
        ).unwrap();

        const list = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];

        if (cancelled) return;

        setServices(list);
        const name =
          list[0]?.serviceCategoryId?.service_category_name ||
          list[0]?.serviceCategoryId?.name ||
          "";
        if (name) setCategoryName(name);
      } catch (error) {
        if (!cancelled) {
          setServices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchServices();
    return () => {
      cancelled = true;
    };
  }, [dispatch, id]);

  const filteredServices = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return services;

    return services.filter((service) => {
      const company = String(service?.serviceProviderId?.company_name || "").toLowerCase();
      const fullName = String(service?.serviceProviderId?.full_name || "").toLowerCase();
      const subName = String(service?.serviceSubCategoryName || "").toLowerCase();
      const desc = String(service?.desc || "").toLowerCase();
      return (
        company.includes(q) ||
        fullName.includes(q) ||
        subName.includes(q) ||
        desc.includes(q)
      );
    });
  }, [services, debouncedSearch]);

  const displayName = formatDisplayTitle(categoryName, "Services");

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim()) {
      return `No services match "${debouncedSearch.trim()}" in this category.`;
    }
    return "No services found in this category yet.";
  }, [debouncedSearch]);

  const handleServiceClick = (serviceId) => {
    navigate(serviceProCategoryDetailPath(serviceId));
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-serviceproviders p-servicecategory">
        <main className="page">
          <div className="wrap">
            <div className="svc-cat-head">
              <h1>{loading && !categoryName ? "Loading…" : displayName}</h1>
              <div className="crumbs">
                <Link to={getAppHomePath()}>Home</Link>
                <span>/</span>
                <Link to="/service-pro">Service Pro</Link>
                <span>/</span>
                <span className="here">{loading && !categoryName ? "…" : displayName}</span>
              </div>
            </div>

            <div className="svc-search-row">
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
                  type="text"
                  placeholder="Search services..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {loading ? (
              <ServiceShimmerGrid />
            ) : filteredServices.length === 0 ? (
              <p className="svc-empty">{emptyMessage}</p>
            ) : (
              <div className="svc-grid">
                {filteredServices.map((service) => {
                  const thumb =
                    Array.isArray(service?.images) && service.images[0]
                      ? serviceImageUrl(service.images[0])
                      : null;
                  const title =
                    formatDisplayTitle(
                      service?.serviceSubCategoryName ||
                        (service?.serviceProviderId?.company_name !== "undefined"
                          ? service?.serviceProviderId?.company_name
                          : null) ||
                        service?.serviceProviderId?.full_name,
                      "Service"
                    );
                  const subtitle =
                    service?.serviceProviderId?.full_name &&
                    service?.serviceSubCategoryName
                      ? formatDisplayTitle(service.serviceProviderId.full_name)
                      : null;

                  return (
                    <button
                      key={service._id}
                      type="button"
                      className="svc-tile"
                      onClick={() => handleServiceClick(service._id)}
                    >
                      <div className="svc-thumb">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={title}
                            onError={handleCategoryImageError}
                          />
                        ) : (
                          <PlaceholderIcon />
                        )}
                        <div className="ov">
                          <span>
                            View service
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                            >
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </span>
                        </div>
                      </div>
                      <div className="svc-name">{title}</div>
                      {subtitle && <div className="svc-desc">{subtitle}</div>}
                      {service.desc && service.desc !== "N/A" && (
                        <div className="svc-desc">{service.desc}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
