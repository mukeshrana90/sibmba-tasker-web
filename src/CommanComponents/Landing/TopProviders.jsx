import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import CustomerActions from "../../Redux/Actions/CustomerActions";
import { useLanding } from "../../context/LandingContext";
import { resolveSearchCoords, TOP_PROVIDER_CITIES } from "../../utils/landingGeocode";
import Api from "../../Services/api";
import EmptyResults from "../EmptyResults";
import { Roles } from "../../utils/Roles";
import { searchProvidersPath } from "../../utils/searchProvidersUrl";
import {
  formatDisplayTitle,
  isVerified,
  limitWords,
  providerDisplayName,
  providerLocation,
  renderStars,
} from "../../utils/landingUtils";
import { serviceProviderPath } from "../../utils/normalizeMongoId";
import ProviderAvatar from "../ProviderAvatar";

// Same 9 cards as before; cities only decide the order
const LIST_LIMIT = 9;
const CITY_RADIUS_M = 50000;

export default function TopProviders() {
  const dispatch = useDispatch();
  // Item 53: one list, Harare matches first, then Bulawayo, Mutare… (null while loading / with a location set)
  const [cityRanked, setCityRanked] = useState(null);
  const navigate = useNavigate();
  // Cards whose long service name is expanded in place (click the name / "…")
  const [openNames, setOpenNames] = useState({});
  const toggleName = (id) => setOpenNames((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const hasOwnLocation = Boolean(
    nearbyEnabled || locationCoords || String(locationText || "").trim()
  );

  useEffect(() => {
    if (hasOwnLocation) {
      setCityRanked(null);
      return undefined;
    }
    let alive = true;
    Promise.all(
      TOP_PROVIDER_CITIES.map((city) =>
        Api.get("/customer/top-rated-services", {
          params: {
            limit: LIST_LIMIT,
            minReviews: 0,
            nearby: true,
            lat: city.lat,
            lng: city.lng,
            radius: CITY_RADIUS_M,
            ...(selectedCategoryId ? { categoryId: selectedCategoryId } : {}),
          },
          skipErrorToast: true,
        })
          .then((res) => res?.data?.data?.items || res?.data?.items || [])
          .catch(() => [])
      )
    ).then((lists) => {
      if (!alive) return;
      const seen = new Set();
      const ranked = [];
      lists.flat().forEach((item) => {
        if (!item?._id || seen.has(item._id)) return;
        seen.add(item._id);
        ranked.push(item);
      });
      setCityRanked(ranked);
    });
    return () => {
      alive = false;
    };
  }, [hasOwnLocation, selectedCategoryId]);

  const catList = categories?.allCat || categories?.data?.allCat || [];
  // City matches in priority order, then the usual list for any slots left
  const items = useMemo(() => {
    const baseItems = topRated?.items || [];
    if (hasOwnLocation || !cityRanked?.length) return baseItems;
    const seen = new Set(cityRanked.map((item) => item._id));
    return [...cityRanked, ...baseItems.filter((item) => !seen.has(item._id))].slice(0, LIST_LIMIT);
  }, [hasOwnLocation, cityRanked, topRated]);
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

  const renderCard = (item, idx) => {
            const sp = item.serviceProvider || {};
            const name = providerDisplayName(sp);
            const verified = isVerified(sp);
            const rating = item.averageRating || 0;
            const reviews = item.reviewCount || 0;
            const service = limitWords(formatDisplayTitle(item.serviceSubCategoryName, "Service"));
            const category = formatDisplayTitle(item.serviceCategoryName);

            return (
              <article className="landing-prov-card" key={item._id}>
                <div className="landing-prov-top">
                  <span className="landing-prov-rank">#{idx + 1}</span>
                  <ProviderAvatar
                    provider={sp}
                    name={name}
                    className="landing-prov-avatar"
                    imgClassName="landing-prov-avatar--img"
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

                <div className="landing-prov-offer">
                  <span className="landing-prov-offer__label">Service</span>
                  {service.truncated ? (
                    <button
                      type="button"
                      className={`landing-prov-service is-truncated${
                        openNames[item._id] ? " is-open" : ""
                      }`}
                      onClick={() => toggleName(item._id)}
                      aria-expanded={Boolean(openNames[item._id])}
                      title={openNames[item._id] ? "Show less" : "Show full name"}
                    >
                      {openNames[item._id] ? service.full : service.display}
                    </button>
                  ) : (
                    <div className="landing-prov-service">{service.display}</div>
                  )}
                  {category && (
                    <span className="landing-prov-cat" title="Category">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="7" width="18" height="13" rx="2" />
                        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
                      </svg>
                      {category}
                    </span>
                  )}
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
            {items.map((item, idx) => renderCard(item, idx))}
            {!items.length && (
              <EmptyResults
                module="services"
                categoryId={selectedCategoryId || undefined}
                message="Here is who's closest right now."
              />
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
