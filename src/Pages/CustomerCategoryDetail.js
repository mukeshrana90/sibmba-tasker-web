import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Loader from "../CommanComponents/Loader";
import SimbaPager from "../CommanComponents/SimbaPager";
import {
  handleCategoryImageError,
  formatDisplayTitle,
  serviceImageUrl,
} from "../utils/landingUtils";
import {
  customerServiceDetailPath,
  normalizeMongoId,
} from "../utils/normalizeMongoId";

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

export default function CustomerCategoryDetail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const categoryId = normalizeMongoId(searchParams.get("categoryId"));

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryName, setCategoryName] = useState(
    location.state?.categoryName || ""
  );
  const [services, setServices] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!categoryId) return;

    const fetchServices = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          CustomerActions.getSubCategoryById({
            categoryId,
            page,
            limit,
            search: debouncedSearch.trim() || undefined,
          })
        ).unwrap();

        const data = result?.data || result;
        setServices(data?.subcategories || []);
        setTotalPages(data?.totalPages || 1);
        if (data?.category?.service_category_name) {
          setCategoryName(data.category.service_category_name);
        }
      } catch (error) {
        console.error("Error fetching category services:", error);
        setServices([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [dispatch, categoryId, page, limit, debouncedSearch]);

  const displayName = formatDisplayTitle(categoryName, "Services");

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim()) {
      return `No services match "${debouncedSearch.trim()}" in this category.`;
    }
    return "No services found in this category yet.";
  }, [debouncedSearch]);

  const handleServiceClick = (serviceId) => {
    navigate(customerServiceDetailPath(serviceId));
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-serviceproviders p-servicecategory">
        <main className="page">
          <div className="wrap">
            <div className="svc-cat-head">
              <h1>{displayName}</h1>
              <div className="crumbs">
                <Link to="/">Home</Link>
                <span>/</span>
                <Link to="/services">Services</Link>
                <span>/</span>
                <span className="here">{displayName}</span>
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div className="svc-loading">
                <Loader />
              </div>
            ) : services.length === 0 ? (
              <p className="svc-empty">{emptyMessage}</p>
            ) : (
              <>
                <div className="svc-grid">
                  {services.map((service) => {
                    const thumb =
                      Array.isArray(service?.images) && service.images[0]
                        ? serviceImageUrl(service.images[0])
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
                              alt={service.serviceSubCategoryName || "Service"}
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
                        <div className="svc-name">
                          {formatDisplayTitle(service.serviceSubCategoryName)}
                        </div>
                        {service.desc && service.desc !== "N/A" && (
                          <div className="svc-desc">{service.desc}</div>
                        )}
                        {service.averageRating > 0 && (
                          <div className="svc-rating">
                            {Number(service.averageRating).toFixed(1)} ★
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <SimbaPager
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
