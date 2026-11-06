import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch } from "react-redux";
import PaginationComponent from "../CommanComponents/PaginationComponent";
import ReadMore from "../CommanComponents/ReadMore";
import ServiceActions from "../Redux/Actions/ServiceActions";
import Form from "react-bootstrap/Form";
import {
  handleUserImageError,
  userImageUrl,
} from "../utils/landingUtils";
import Loader from "../CommanComponents/Loader";
import EmptyResults from "../CommanComponents/EmptyResults";
import { HARARE } from "../utils/landingGeocode";

export default function NearByCorporate() {
  const dispatch = useDispatch();
  const Navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(10);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [nearByCorporate, setNearByCorporate] = useState("");
  const [search, setSearch] = useState("");

  // Item 52: without a saved location, start from Harare instead of loading forever
  const lat = localStorage.getItem("latitude") || HARARE.lat;
  const long = localStorage.getItem("longitude") || HARARE.lng;

  useEffect(() => {
    if (lat && long) {
      const fetchData = async () => {
        const payload = {
          lat: lat,
          lng: long,
          page: page,
          limit: limit,
        };
        try {
          setLoading(true);
          const response = await dispatch(
            ServiceActions.getNearbyCorporateUser(payload)
          ).unwrap();
          setNearByCorporate(response.data || []);
          if (response?.totalPages) setTotalPages(response.totalPages);
        } catch (error) {
          console.error("Failed to fetch purchase products:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [dispatch, page, lat, long, limit]);

  const filteredList = (nearByCorporate || []).filter((item) =>
    (item.full_name + " " + item.corporateCategoryId?.name)
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleProfiles = (type, id) => {
    if (type === "corporate") {
      Navigate(`/get-corporate/${id}`);
    }
  };

  return (
    <Layout>
      <section className="breadcrumb-nav">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="breadcrumb-nav-contain">
                <h2>Nearby Corporates</h2>
                <p>
                  <span
                    style={{
                      color: "#0f5c4c",
                      cursor: "pointer",
                    }}
                    onClick={() => Navigate("/")}
                  >
                    Home
                  </span>{" "}
                  / Corporates
                </p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      <section className="category-services-sec pt-0 mt-5">
        <Container>
          <div className="category-services-lists">
            {loading ? (
              <Loader />
            ) : (
              <>
                <div className="input-group sort-by-filter w-25 bg-white border-end-0 d-flex mb-4">
                  <span className="input-group-text border-end-0">
                    <img
                      src={require("../Assets/Images/search-icon.svg").default}
                      alt="Search"
                      width="16"
                      height="16"
                    />
                  </span>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-start-0"
                  />
                </div>

                {Array.isArray(filteredList) && filteredList.length > 0 ? (
                  <>
                    <div className="services-list">
                      {Array.isArray(filteredList) &&
                        filteredList.length > 0 &&
                        filteredList.map((ele, index) => (
                          <div key={index}>
                            <img
                              onClick={() =>
                                handleProfiles("corporate", ele?._id)
                              }
                              className="point-cursor"
                              src={userImageUrl(ele)}
                              alt="categories-img"
                              onError={handleUserImageError}
                            />
                            <h3>{ele?.full_name}</h3>
                            <ReadMore
                              desc={ele?.address || ele?.street_address || "-"}
                            />
                          </div>
                        ))}
                    </div>

                    <div className="pagination-flexs">
                      <PaginationComponent
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyResults module="corporate" coords={{ lat: Number(lat), lng: Number(long) }} />
                )}
              </>
            )}
          </div>
        </Container>
      </section>
    </Layout>
  );
}
