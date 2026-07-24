import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Loader from "../CommanComponents/Loader";
import SimbaPager from "../CommanComponents/SimbaPager";
import SimbaPageBanner from "../CommanComponents/SimbaPageBanner";
import {
  defaultImage,
  formatDisplayTitle,
  handleServiceImageError,
  providerDisplayName,
  resolveServiceListImageSrc,
} from "../utils/landingUtils";
import {
  customerServiceDetailPath,
  normalizeMongoId,
  serviceProviderPath,
} from "../utils/normalizeMongoId";
import ProviderAvatar from "../CommanComponents/ProviderAvatar";

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

  const handleProviderClick = (event, providerId, serviceId) => {
    event.preventDefault();
    event.stopPropagation();
    const path = serviceProviderPath(providerId, serviceId);
    if (path) navigate(path);
  };

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-serviceproviders p-servicecategory">
        <SimbaPageBanner
          title={displayName}
          crumbLabel={displayName}
          midCrumb={{ to: "/services", label: "Services" }}
        />

        <main className="page">
          <div className="wrap">
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
                <div className="cat-grid">
                  {services.map((service) => {
                    const imageSrc = service.images?.length
                      ? service.images[0]
                      : null;
                    const thumbFromApi = service.images_thumb?.[0];
                    const displaySrc =
                      resolveServiceListImageSrc(imageSrc, thumbFromApi) ||
                      defaultImage;
                    const provider = service.serviceProviderId;
                    const providerId =
                      provider?._id || provider?.id || provider;
                    const ownerName = provider
                      ? providerDisplayName(provider)
                      : "";

                    return (
                      <div
                        key={service._id}
                        className={`cat-tile${
                          provider ? " cat-tile--with-owner" : ""
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleServiceClick(service._id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleServiceClick(service._id);
                          }
                        }}
                      >
                        <div className="cat-thumb">
                          <img
                            src={displaySrc}
                            alt={
                              service.serviceSubCategoryName || "Service"
                            }
                            onError={(e) =>
                              handleServiceImageError(e, imageSrc)
                            }
                          />
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
                          {provider && providerId && (
                            <button
                              type="button"
                              className="cat-owner-overlay"
                              aria-label={`View provider ${ownerName}`}
                              onClick={(e) =>
                                handleProviderClick(
                                  e,
                                  providerId,
                                  service._id
                                )
                              }
                            >
                              <ProviderAvatar
                                provider={provider}
                                className="cat-owner-av"
                                name={ownerName}
                              />
                              <div className="cat-owner-meta">
                                <span className="cat-owner-label">
                                  Offered by
                                </span>
                                <b>{ownerName}</b>
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="cat-body">
                          <div className="cat-name">
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
                        </div>
                      </div>
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
