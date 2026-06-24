import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ServiceActions from "../../Redux/Actions/ServiceActions";
import CorporatePageShell from "../../CommanComponents/CorporatePageShell";
import Loader from "../../CommanComponents/Loader";
import SimbaPager from "../../CommanComponents/SimbaPager";
import {
  corporateCategoryImageUrl,
  handleCategoryImageError,
} from "../../utils/landingUtils";

function PlaceholderIcon() {
  return (
    <svg className="ph" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L9 20" />
    </svg>
  );
}

export default function CorporatePro() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const corporateSuggestions = useSelector((e) => e.service.corporateCategory);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          ServiceActions.getCorporateCategoryList({ page, limit })
        ).unwrap();
        setTotalPages(result?.pagination?.pages || 1);
      } catch (error) {
        console.error("Error fetching corporate categories:", error);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [dispatch, page, limit]);

  const categories = corporateSuggestions?.data || [];

  return (
    <CorporatePageShell
      title="Browse Corporate By Category"
      crumbLabel="Corporate Pro"
    >
      {loading ? (
        <div className="corp-loading">
          <Loader />
        </div>
      ) : categories.length === 0 ? (
        <p className="corp-empty">No corporate categories available yet.</p>
      ) : (
        <>
          <div className="cc-grid">
            {categories.map((cat) => {
              const imgSrc = corporateCategoryImageUrl(cat?.image);
              const hasImage =
                cat?.image && cat.image !== "undefined" && cat.image !== "null";

              return (
                <button
                  key={cat._id}
                  type="button"
                  className="cc-tile"
                  onClick={() => navigate(`/corporate/corporate-pro-detail/${cat._id}`)}
                >
                  <div className="cc-img">
                    {hasImage ? (
                      <img
                        src={imgSrc}
                        alt={cat.name}
                        loading="lazy"
                        onError={handleCategoryImageError}
                      />
                    ) : (
                      <PlaceholderIcon />
                    )}
                    <div className="ov">
                      <span>
                        View suppliers
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="cc-title">{cat.name}</div>
                  <div className="cc-desc">
                    {cat.description || "Explore corporate suppliers"}
                  </div>
                </button>
              );
            })}
          </div>
          <SimbaPager page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </CorporatePageShell>
  );
}
