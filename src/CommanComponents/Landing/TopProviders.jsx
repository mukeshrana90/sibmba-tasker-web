import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { useLanding } from "../../context/LandingContext";
import { resolveSearchCoords } from "../../utils/landingGeocode";
import { Roles } from "../../utils/Roles";
import { searchProvidersPath } from "../../utils/searchProvidersUrl";
import {
  defaultProviderAvatar,
  formatDisplayTitle,
  isVerified,
  providerDisplayName,
  providerImageUrl,
  providerLocation,
  renderStars,
} from "../../utils/landingUtils";
import { serviceProviderPath } from "../../utils/normalizeMongoId";

export default function TopProviders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    selectedCategoryId,
    selectCategory,
    nearbyEnabled,
    locationText,
    locationCoords,
  } = useLanding();

  const categories = useSelector((s) => s.UserSlice.categories);
  const topRated = useSelector((s) => s.UserSlice.topRatedServices);

  useEffect(() => {
    dispatch(CustomerActions.getCategories({ limit: 20 }));
  }, [dispatch]);

  useEffect(() => {
    const coords = resolveSearchCoords(
      locationText,
      nearbyEnabled,
      locationCoords
    );
    dispatch(
      CustomerActions.getTopRatedServices({
        limit: 9,
        minReviews: 0,
        nearby: nearbyEnabled,
        ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      })
    );
  }, [
    dispatch,
    selectedCategoryId,
    nearbyEnabled,
    locationText,
    locationCoords,
  ]);

  const catList = categories?.allCat || categories?.data?.allCat || [];
  const items = topRated?.items || [];
  const total = topRated?.total ?? 0;
  const showViewAll = total > 9;

  const viewAllPath = useMemo(() => {
    const coords = resolveSearchCoords(
      locationText,
      nearbyEnabled,
      locationCoords
    );
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const resultsPath =
      token && String(role) === String(Roles.CUSTOMER)
        ? "/customer-search-providers"
        : "/search-providers";

    return searchProvidersPath(resultsPath, {
      ...(selectedCategoryId ? { categoryIds: [selectedCategoryId] } : {}),
      location: locationText?.trim() || "",
      lat: coords?.lat,
      lng: coords?.lng,
      nearby: nearbyEnabled,
    });
  }, [selectedCategoryId, locationText, nearbyEnabled, locationCoords]);

  const handleProfile = (item) => {
    const pid = item.serviceProvider?._id;
    const sid = item._id;
    if (!pid) return;
    navigate(serviceProviderPath(pid, sid));
  };

  return (
    <section className="landing-section landing-section--providers" id="providers">
      <div className="landing-wrap">
        <div className="landing-sec-head">
          <div className="landing-sec-head__text">
            <span className="landing-eyebrow">⭐ Top rated</span>
            <h2>Meet our top providers</h2>
            <p>
              Hand-picked professionals with the highest ratings and most
              completed jobs.
            </p>
          </div>
        </div>

        <div className="landing-pills">
          <button
            type="button"
            className={`landing-pill${!selectedCategoryId ? " is-active" : ""}`}
            onClick={() => selectCategory(null)}
          >
            All
          </button>
          {catList.slice(0, 8).map((cat) => (
            <button
              type="button"
              key={cat._id}
              className={`landing-pill${
                selectedCategoryId === cat._id ? " is-active" : ""
              }`}
              onClick={() => selectCategory(cat._id)}
            >
              {formatDisplayTitle(cat.service_category_name)}
            </button>
          ))}
        </div>

        <div className="landing-prov-grid">
          {items.map((item, idx) => {
            const sp = item.serviceProvider || {};
            const name = providerDisplayName(sp);
            const img = providerImageUrl(sp);
            const verified = isVerified(sp);
            const rating = item.averageRating || 0;
            const reviews = item.reviewCount || 0;

            return (
              <article className="landing-prov-card" key={item._id}>
                <div className="landing-prov-top">
                  <span className="landing-prov-rank">#{idx + 1}</span>
                  <img
                    className="landing-prov-avatar landing-prov-avatar--img"
                    src={img}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultProviderAvatar;
                    }}
                  />
                  <div className="landing-prov-id">
                    <h4>
                      {name}
                      {verified && (
                        <span className="landing-verified" title="Verified">
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
                    <div className="landing-prov-role">
                      {formatDisplayTitle(item.serviceSubCategoryName)}
                    </div>
                    <div className="landing-prov-loc">
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
                      {providerLocation(sp)}
                    </div>
                  </div>
                </div>

                <div className="landing-prov-meta">
                  <div className="landing-rating">
                    <span className="landing-stars">{renderStars(rating)}</span>
                    {reviews > 0 ? (
                      <>
                        {rating}
                        <span className="landing-rev">({reviews})</span>
                      </>
                    ) : (
                      <span className="landing-rev">New</span>
                    )}
                  </div>
                </div>

                <div className="landing-prov-skills">
                  <span className="landing-skill">{formatDisplayTitle(item.serviceSubCategoryName)}</span>
                  {item.serviceCategoryName && (
                    <span className="landing-skill">{formatDisplayTitle(item.serviceCategoryName)}</span>
                  )}
                </div>

                <div className="landing-prov-foot">
                  <span className="landing-status">
                    <span className="landing-dot" />
                    Available now
                  </span>
                  <button
                    type="button"
                    className="landing-view-btn"
                    onClick={() => handleProfile(item)}
                  >
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
                  </button>
                </div>
              </article>
            );
          })}
          {!items.length && (
            <p className="landing-empty">
              No providers to show yet. Check back soon.
            </p>
          )}
        </div>

        {showViewAll && (
          <div className="landing-prov-actions">
            <Link to={viewAllPath} className="landing-btn landing-btn--ghost">
              View all
              <svg
                width="18"
                height="18"
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
        )}
      </div>
    </section>
  );
}
