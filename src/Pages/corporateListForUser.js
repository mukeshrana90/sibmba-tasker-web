import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import Loader from "../CommanComponents/Loader";
import SimbaPager from "../CommanComponents/SimbaPager";
import SimbaPageBanner from "../CommanComponents/SimbaPageBanner";
import {
  corporateCategoryImageUrl,
  formatDisplayTitle,
} from "../utils/landingUtils";

function PlaceholderIcon() {
  return (
    <svg
      className="ph"
      width="72"
      height="72"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

export default function CorporateListForUser() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
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
          ServiceActions.getCorporateCategoryList({
            page,
            limit,
            search: debouncedSearch.trim() || undefined,
          })
        ).unwrap();
        setCategories(result?.data || []);
        setTotalPages(result?.pagination?.pages || 1);
      } catch (error) {
        console.error("Failed to fetch corporate categories:", error);
        setCategories([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [dispatch, page, limit, debouncedSearch]);

  const handleCategoryClick = (category) => {
    navigate(`/corporate-category-detail/${category._id}`, {
      state: { categoryName: category.name },
    });
  };

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return `No categories match "${search.trim()}".`;
    }
    return "No corporate categories available yet.";
  }, [search]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-corporate">
        <SimbaPageBanner
          title="Browse Corporate By Category"
          crumbLabel="Corporate Category"
        />

        <main className="page">
          <div className="wrap">
            <div className="corp-search-row">
              <div className="corp-search">
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
                  placeholder="Search categories..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {loading ? (
              <div className="corp-loading">
                <Loader />
              </div>
            ) : categories.length === 0 ? (
              <p className="corp-empty">{emptyMessage}</p>
            ) : (
              <>
                <div className="cc-grid">
                  {categories.map((category) => {
                    const imgSrc = corporateCategoryImageUrl(category?.image);
                    const hasImage =
                      category?.image &&
                      category.image !== "undefined" &&
                      category.image !== "null";

                    return (
                      <button
                        key={category._id}
                        type="button"
                        className="cc-tile"
                        onClick={() => handleCategoryClick(category)}
                      >
                        <div className="cc-img">
                          {hasImage ? (
                            <img
                              src={imgSrc}
                              alt={category.name}
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <PlaceholderIcon />
                          )}
                          <div className="ov">
                            <span>
                              View suppliers
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
                        <div className="cc-title">{formatDisplayTitle(category.name)}</div>
                        <div className="cc-desc">
                          {category.description || "Explore corporate suppliers"}
                        </div>
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
