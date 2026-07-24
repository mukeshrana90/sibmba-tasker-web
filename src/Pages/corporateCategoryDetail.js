import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import ServiceActions from "../Redux/Actions/ServiceActions";
import Loader from "../CommanComponents/Loader";
import SimbaPager from "../CommanComponents/SimbaPager";
import {
  avatarColor,
  formatDisplayTitle,
  handleUserImageError,
  providerInitials,
  renderStars,
  userImageUrl,
} from "../utils/landingUtils";

function cleanVal(value) {
  if (value == null || value === "" || value === "undefined" || value === "null") {
    return null;
  }
  return String(value).trim() || null;
}

function corporateName(corp) {
  const raw =
    cleanVal(corp?.full_name) || cleanVal(corp?.company_name) || "Corporate";
  return formatDisplayTitle(raw, "Corporate");
}

function corporateLocation(corp) {
  const city = cleanVal(corp?.city);
  if (city) return city;

  const address = cleanVal(corp?.address);
  if (!address) return "Zimbabwe";

  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return parts[parts.length - 3];
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0];
}

function corporateTags(corp, categoryName) {
  const tags = [];
  const shop = cleanVal(corp?.shop_name);
  const category =
    cleanVal(corp?.corporateCategoryId?.name) || cleanVal(categoryName);

  if (shop) tags.push(shop);
  if (category && category !== shop) tags.push(category);
  return tags;
}

function CorporateCard({ corp, rank, categoryName }) {
  const name = corporateName(corp);
  const verified = corp?.account_verified === 1;
  const rating = Number(corp?.feedbackAvg) || 0;
  const reviewCount = corp?.feedbackCount || 0;
  const tags = corporateTags(corp, categoryName);
  const hasImage = Boolean(cleanVal(corp?.profile_image));
  const profileImage = userImageUrl(corp);

  return (
    <article className="prov-card corp-prov-card">
      <div className="prov-top">
        <span className="corp-rank">#{rank}</span>
        {hasImage ? (
          <img
            className="avatar avatar--img"
            src={profileImage}
            alt={name}
            onError={handleUserImageError}
          />
        ) : (
          <div
            className="avatar"
            style={{
              background: `linear-gradient(145deg,${avatarColor(name)},${avatarColor(name)}cc)`,
            }}
          >
            {providerInitials(name)}
          </div>
        )}
        <div className="prov-id">
          <h4>
            {name}
            {verified && (
              <span className="verified" title="Verified">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m20 6-11 11-5-5" />
                </svg>
              </span>
            )}
          </h4>
          <div className="role">
            {formatDisplayTitle(cleanVal(corp?.shop_name) || categoryName)}
          </div>
          <div className="loc">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            {corporateLocation(corp)}
          </div>
        </div>
      </div>

      <div className="prov-meta">
        <div className="rating">
          <span className="stars">{renderStars(rating)}</span>
          {reviewCount > 0 ? rating.toFixed(1) : "0.0"}
          <span className="rev">({reviewCount})</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="prov-skills">
          {tags.map((tag) => (
            <span key={tag} className="skill">
              {formatDisplayTitle(tag)}
            </span>
          ))}
        </div>
      )}

      <div className="prov-foot">
        <span className="status">
          <span className="dot" />
          {verified ? "Verified supplier" : "Corporate supplier"}
        </span>
        <Link to={`/get-corporate/${corp._id}`} className="view-btn">
          View profile
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

export default function CorporateCategoryDetail() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { categoryId } = useParams();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [corporates, setCorporates] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const categoryName = formatDisplayTitle(
    location.state?.categoryName ||
      corporates[0]?.corporateCategoryId?.name,
    "Corporate Category"
  );

  useEffect(() => {
    if (!categoryId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await dispatch(
          ServiceActions.getNearbyCorporateWithCategory({
            page,
            limit,
            category_id: categoryId,
            search: debouncedSearch.trim() || undefined,
          })
        ).unwrap();

        setCorporates(result?.data || []);
        setTotalPages(result?.totalPages || 1);
        setTotalCount(result?.total ?? (result?.data || []).length);
      } catch (error) {
        console.error("Failed to fetch corporates for category:", error);
        setCorporates([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, page, limit, categoryId, debouncedSearch]);

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return `No corporates match "${search.trim()}" in this category.`;
    }
    return "No corporate suppliers found in this category yet.";
  }, [search]);

  const resultLabel = useMemo(() => {
    if (totalCount === 0) return "No corporates found";
    if (totalCount === 1) return "1 corporate found";
    return `${totalCount} corporates found`;
  }, [totalCount]);

  return (
    <Layout footerVariant="marketing">
      <div className="simba-page p-corporate p-corp-directory">
        <section className="corp-banner">
          <h1>{categoryName}</h1>
          <nav className="crumbs" aria-label="Breadcrumb">
            <span className="crumbs-path">
              <Link to="/">Home</Link>
              <span className="crumbs-sep" aria-hidden="true">
                /
              </span>
              <Link to="/corporate-list">Corporate Category</Link>
              <span className="crumbs-sep" aria-hidden="true">
                /
              </span>
            </span>
            <span className="here" title={categoryName}>
              {categoryName}
            </span>
          </nav>
        </section>

        <main className="page listing">
          <div className="wrap">
            <div className="corp-directory-toolbar">
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
                  placeholder="Search corporates in this category..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {!loading && (
                <p className="results-count">
                  Showing <b>{corporates.length}</b> of <b>{totalCount}</b> —{" "}
                  {resultLabel}
                </p>
              )}
            </div>

            {loading ? (
              <div className="corp-loading">
                <Loader />
              </div>
            ) : corporates.length === 0 ? (
              <div className="empty">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
                </svg>
                <h3>No corporates yet</h3>
                <p>{emptyMessage}</p>
              </div>
            ) : (
              <>
                <div className="prov-grid">
                  {corporates.map((corp, idx) => (
                    <CorporateCard
                      key={corp._id}
                      corp={corp}
                      rank={(page - 1) * limit + idx + 1}
                      categoryName={categoryName}
                    />
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
