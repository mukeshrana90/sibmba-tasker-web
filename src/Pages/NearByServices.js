import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import SimbaPager from "../CommanComponents/SimbaPager";
import Loader from "../CommanComponents/Loader";
import {
  categoryImageUrl,
  handleCategoryImageError,
} from "../utils/landingUtils";

export default function NearByServices() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const limit = 20;
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const nearByServices = useSelector((e) => e.UserSlice.nearByServices);

  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");
  const categoryId = new URLSearchParams(location.search).get("categoryId");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!lat || !long) {
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      setLoading(true);
      try {
        const payload = { lat, long, page, limit };
        if (categoryId) payload.categoryId = categoryId;
        await dispatch(CustomerActions.getNearByServices(payload));
      } catch (error) {
        console.error("Error fetching nearby services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [dispatch, lat, long, page, categoryId, limit]);

  const allCats = Array.isArray(nearByServices?.data) ? nearByServices.data : [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allCats;
    return allCats.filter((cat) => {
      const name = cat?.service_category_name || cat?.name || "";
      return name.toLowerCase().includes(q);
    });
  }, [allCats, debouncedSearch]);

  const totalCount = nearByServices?.total ?? allCats.length;
  const totalPages = nearByServices?.totalPages ?? 1;

  const handleCategoryClick = (id) => {
    if (!token) {
      navigate("/login");
      return;
    }
    const cat = allCats.find((c) => String(c._id) === String(id));
    const categoryName =
      cat?.service_category_name || cat?.serviceSubCategoryName || cat?.name || "";
    navigate(`/near-by-service-provider?categoryId=${id}`, {
      state: { categoryName },
    });
  };

  const emptyMessage = useMemo(() => {
    if (!lat || !long) {
      return "Enable location in your browser to find providers near you.";
    }
    if (debouncedSearch.trim()) {
      return `No nearby categories match "${debouncedSearch.trim()}".`;
    }
    return "No providers found near your location yet.";
  }, [lat, long, debouncedSearch]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-nearbyservices p-serviceproviders">
        <section className="nearby-hero">
          <div className="blob a" aria-hidden="true" />
          <div className="wrap">
            <div className="crumbs">
              <Link to="/">Home</Link>
              <span>/</span>
              <span className="here">Nearby Providers</span>
            </div>
            <h1>Nearby Providers</h1>
            <p className="sub">
              Browse service categories with verified professionals close to your
              location.
            </p>
          </div>
        </section>

        <main className="page">
          <div className="wrap">
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
                  type="text"
                  placeholder="Search nearby categories"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {lat && long && (
                <p className="nearby-count">
                  <b>{totalCount}</b> categories near you
                </p>
              )}
            </div>

            {loading ? (
              <div className="svc-loading">
                <Loader />
              </div>
            ) : filtered.length === 0 ? (
              <div className="svc-empty">
                <p>{emptyMessage}</p>
                {(!lat || !long) && (
                  <button
                    type="button"
                    className="btn btn-primary nearby-loc-btn"
                    onClick={() => window.location.reload()}
                  >
                    Retry location
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="cat-grid">
                  {filtered.map((cat) => {
                    const name =
                      cat?.service_category_name ||
                      cat?.serviceSubCategoryName ||
                      cat?.name;
                    const count = cat?.providerNearbyCount ?? 0;

                    return (
                      <button
                        key={cat._id}
                        type="button"
                        className="cat-tile"
                        onClick={() => handleCategoryClick(cat._id)}
                      >
                        <div className="cat-thumb">
                          <img
                            src={categoryImageUrl(cat)}
                            alt={name}
                            onError={handleCategoryImageError}
                          />
                          <div className="ov">
                            <span>
                              View providers
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
                          {count > 0 && (
                            <span className="nearby-badge">{count} nearby</span>
                          )}
                        </div>
                        <div className="cat-name">{name}</div>
                        <div className="cat-meta">
                          {count > 0 ? `${count} providers near you` : "No providers nearby"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!debouncedSearch.trim() && totalPages > 1 && (
                  <SimbaPager
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </Layout>
  );
}
