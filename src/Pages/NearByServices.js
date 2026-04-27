import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import defaultImage from "../Assets/Images/placeholder.jpg";

export default function NearByServices() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 20;
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const nearByServices = useSelector((e) => e.UserSlice.nearByServices);

  const lat = localStorage.getItem("latitude");
  const long = localStorage.getItem("longitude");

  useEffect(() => {
    if (lat && long) {
      const fetchServices = async () => {
        setLoading(true);
        try {
          await dispatch(CustomerActions.getNearByServices({ lat, long, page, limit }));
        } catch (error) {
          console.error("Error fetching nearby services:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchServices();
    }
  }, [dispatch, lat, long, page]);

  const handleCategoryClick = (id) => {
    if (token) {
      Navigate(`/customer-category-detail?categoryId=${id}`);
    } else {
      Navigate("/login");
    }
  };

  const allCats = Array.isArray(nearByServices?.data) ? nearByServices.data : [];

  const filtered = search.trim()
    ? allCats.filter((ele) => {
        const name = ele?.service_category_name || ele?.name || "";
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : allCats;

  const totalCount = nearByServices?.total ?? allCats.length;

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <div className="breadcrumb-nav-contain">
            <h2>Nearby Providers</h2>
            <p>
              <span
                style={{ color: "#038654", cursor: "pointer" }}
                onClick={() => Navigate("/")}
              >
                Home
              </span>{" "}
              / Nearby Providers
            </p>
          </div>
        </Container>
      </section>

      <section className="nearby-providers-page">
        <Container>
          {/* Search bar */}
          <div className="nearby-search-bar">
            <span className="nearby-search-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#038654"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search nearby categories"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Result count */}
          <div className="nearby-result-count">{totalCount} Results</div>

          {/* Card list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p>Loading...</p>
            </div>
          ) : filtered.length > 0 ? (
            <>
              <div className="nearby-provider-list">
                {filtered.map((ele, index) => {
                  const imgSrc = ele?.image
                    ? `${process.env.REACT_APP_API_URL}${ele.image}`
                    : Array.isArray(ele?.images) && ele.images.length > 0
                    ? `${process.env.REACT_APP_API_URL}/user/${ele.images[0]}`
                    : defaultImage;
                  const name =
                    ele?.service_category_name ||
                    ele?.serviceSubCategoryName ||
                    ele?.name;
                  const count = ele?.providerNearbyCount ?? null;
                  return (
                    <div
                      key={ele?._id || index}
                      className="nearby-provider-card"
                      onClick={() => handleCategoryClick(ele._id)}
                    >
                      <img src={imgSrc} alt={name} />
                      <div className="nearby-provider-card-info">
                        <h4>
                          {count !== null ? `${count} ` : ""}
                          {name}
                        </h4>
                        <p>near you</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {nearByServices?.total > limit && (
                <div className="pagination-flexs mt-5">
                  <div></div>
                  <PaginationComponent
                    page={page}
                    setPage={setPage}
                    totalPages={nearByServices?.totalPages}
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <h3 className="text-center">No providers found near you</h3>
            </div>
          )}
        </Container>
      </section>
    </Layout>
  );
}
