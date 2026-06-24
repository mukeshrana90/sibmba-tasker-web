import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Loader from "../CommanComponents/Loader";
import SimbaPager from "../CommanComponents/SimbaPager";
import SimbaPageBanner from "../CommanComponents/SimbaPageBanner";
import {
  categoryImageUrl,
  defaultImage,
  formatDisplayTitle,
} from "../utils/landingUtils";

export default function Services() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          CustomerActions.getCategories({
            page,
            limit,
            search: debouncedSearch.trim() || undefined,
          })
        ).unwrap();
        const data = result?.data || result;
        setCategories(data?.allCat || []);
        setTotalPages(data?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching service categories:", error);
        setCategories([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [dispatch, page, limit, debouncedSearch]);

  const handleCategoryClick = (categoryId, categoryName) => {
    if (!token) {
      navigate("/login");
      return;
    }
    navigate(`/customer-category-detail?categoryId=${categoryId}`, {
      state: { categoryName },
    });
  };

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim()) {
      return `No categories match "${debouncedSearch.trim()}".`;
    }
    return "No service categories available yet.";
  }, [debouncedSearch]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-serviceproviders">
        <SimbaPageBanner
          title="Browse Services By Category"
          crumbLabel="Service Category"
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
                  placeholder="Search service category..."
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
            ) : categories.length === 0 ? (
              <p className="svc-empty">{emptyMessage}</p>
            ) : (
              <>
                <div className="cat-grid">
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      className="cat-tile"
                      onClick={() =>
                        handleCategoryClick(
                          category._id,
                          category.service_category_name
                        )
                      }
                    >
                      <div className="cat-thumb">
                        <img
                          src={categoryImageUrl(category)}
                          alt={category.service_category_name || "Category"}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultImage;
                          }}
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
                      </div>
                      <div className="cat-name">
                        {formatDisplayTitle(category.service_category_name)}
                      </div>
                    </button>
                  ))}
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
