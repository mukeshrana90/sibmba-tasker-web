import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useParams } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import Slider from "react-slick";
import Modal from "react-bootstrap/Modal";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { toast } from "react-toastify";
import Loader from "../CommanComponents/Loader";
import {
  getQuotationPosterDecisionState,
  mergeQuotationWithParentTaskForStatus,
} from "../utils/quotationPosterDecision";
export default function QuotationsDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  // const {quotationDetailById  } = useSelector((state) => state.UserSlice?.quotationDetail)?.quotation;
   const quotationDetailState = useSelector((state) => state.UserSlice.quotationDetail);
  const quotationDetailById = quotationDetailState?.quotation;
  const handleClose = () => setShow(false);
  var settings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    dispatch(CustomerActions.getQuotationDataById(id)).finally(() =>
      setLoading(false)
    );
  }, [dispatch, id]);

  const handleAccept = (data, type) => {
    const obj = {
      quatation_id: data?._id,
      task_id: data?.task_id?._id ?? data?.task_id,
      service_provider_id: data?.service_provider?._id,
      status: type === "accept" ? 1 : 2,
    };
    const providerName =
      data?.service_provider?.full_name?.trim() || "Provider";

    dispatch(CustomerActions.acceptRejectTaskStatus(obj)).then((res) => {
      if (res?.payload?.success) {
        toast.success(
          type === "accept"
            ? `You accepted ${providerName}'s quotation.`
            : `You rejected ${providerName}'s quotation.`
        );
        dispatch(CustomerActions.getQuotationDataById(id));
        dispatch(CustomerActions.getMyQuotationsList());
        dispatch(CustomerActions.getPostList());
      } else {
        toast.error(res?.payload?.message || "Could not update quotation.");
      }
    });
  };

  const mergedQuotationForUi = quotationDetailById
    ? mergeQuotationWithParentTaskForStatus(
        quotationDetailById,
        quotationDetailById?.task_id
      )
    : null;
  const posterState = mergedQuotationForUi
    ? getQuotationPosterDecisionState(mergedQuotationForUi)
    : { showActions: true, badge: null };

  const isCustomerPoster =
    Number(window.localStorage.getItem("role")) === 1 ||
    String(window.localStorage.role) === "1";


  return (
    <Layout>
      <section className="service-detail-sec">
        <Container>
          <Row>
            <Col lg={12}>
              <div class="bookings-details-title">
                <h2>Quotations Details</h2>
              </div>
            {loading && (!quotationDetailById || Object.keys(quotationDetailById).length === 0) ? (
                <Loader></Loader>
              )
               :  quotationDetailById && (
              <div className="quotation mt-3">
                <div>
                  <div className="quotation-txt-show">
                    <div className="profile-side">
                      <img
                        className="point-cursor"
                        src={
                          quotationDetailById?.service_provider?.profile_image
                            ? `${process.env.REACT_APP_API_URL}${quotationDetailById?.service_provider?.profile_image}`
                            : ""
                        }
                        alt="Service Provider"
                      />
                      <div>
                        <h5>{quotationDetailById?.service_provider?.full_name || ""}</h5>
                        <p>{quotationDetailById?.service_provider?.company_name !== 'undefined' ?  quotationDetailById?.service_provider?.company_name : '-' || ""}</p>
                        <p>{quotationDetailById?.service_provider?.address  !== 'undefined' ? quotationDetailById?.service_provider?.address : "-"}</p>
                        <div className="rating-stars">
                          <ul>
                            <li>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                  fill="#FFC107"
                                />
                              </svg>
                            </li>
                            <li>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                  fill="#FFC107"
                                />
                              </svg>
                            </li>
                            <li>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                  fill="#FFC107"
                                />
                              </svg>
                            </li>
                            <li>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                  fill="#FFC107"
                                />
                              </svg>
                            </li>
                            <li>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <path
                                  d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                                  fill="#FFC107"
                                />
                              </svg>
                            </li>
                          </ul>
                          <p>(0 reviews)</p>
                        </div>
                      </div>
                    </div>
                    <div>
                    <h5>${quotationDetailById?.offer_price || "0"}</h5>
                      <p>Offer Price</p>
                    </div>
                  </div>
                  <p>{quotationDetailById?.description || "No description provided"}</p>
                     {quotationDetailById?.service_provider?.corporateSuggestions?.length > 0 && (
                      <div className="suggested-caproate">
                        <h5>Suggested Corporate</h5>
                        <div className="modal-scrollable-list px-4 pt-2 pb-3 flex-grow-1 overflow-auto">
                          {quotationDetailById?.service_provider.corporateSuggestions?.map((item, index) => {
                            const corp = item?.corporateIds;
                            if (!corp) return null;

                            return (
                              <div
                                key={item._id || index}
                                className="corporate-item d-flex align-items-center py-2 "
                                style={{ gap: "10px" }}
                              >
                            {
                                corp.profile_image ? (
                                  <img
                                    src={`${process.env.REACT_APP_API_URL}/${corp.profile_image}`}
                                    alt={corp.full_name}
                                    className="rounded-circle"
                                    width={40}
                                    height={40}
                                  />
                                ) : (
                                  <div
                                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center"
                                    style={{ width: 40, height: 40, fontWeight: 'bold', fontSize: 18 }}
                                  >
                                    {corp.full_name?.[0]?.toUpperCase() || "?"}
                                  </div>
                                )
                              }

                                <div className="flex-grow-1">
                                 <div className="fw-bold d-flex align-items-center gap-2">
                                  {corp.full_name}
                                  {Number(item?.userStatus) === 1 && (
                                    <span className="badge bg-success">Selected</span>
                                  )}
                                </div>
                                  <div className="text-muted small">{corp.shop_name}</div>
                                  <div className="text-muted small">{corp.email}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              {isCustomerPoster && posterState.showActions ? (
                <div className="quotation-requests-btns quotation-requests-action">
                  <button
                    type="button"
                    onClick={() =>
                      handleAccept(quotationDetailById, "accept")
                    }
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleAccept(quotationDetailById, "reject")
                    }
                  >
                    Reject
                  </button>
                </div>
              ) : null}
              </div>
               )
              }
            </Col>
          </Row>
        </Container>
      </section>

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Body>
          <div className="comman-small-pop">
            <div className="center-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="61"
                height="61"
                viewBox="0 0 61 61"
                fill="none"
              >
                <path
                  d="M0.54669 32.2327C0.537783 32.0754 0.528876 31.918 0.522938 31.7606C0.499186 31.1727 0.493248 30.5818 0.508093 29.9939C0.522938 29.406 0.552628 28.8181 0.603101 28.2332C0.653575 27.6482 0.721862 27.0633 0.807963 26.4843C0.894064 25.9023 0.997979 25.3263 1.11971 24.7502C1.24144 24.1742 1.37801 23.6041 1.5324 23.037C1.68679 22.4699 1.85899 21.9057 2.04604 21.3504C2.23308 20.7922 2.43498 20.2399 2.65468 19.6936C2.87439 19.1473 3.10597 18.6069 3.35537 18.0724C3.60476 17.5379 3.869 17.0124 4.14512 16.4927C4.42421 15.9731 4.71517 15.4624 5.02395 14.9576C5.32975 14.4529 5.65041 13.96 5.9859 13.473C6.31843 12.9861 6.66581 12.511 7.02802 12.0448C7.38727 11.5786 7.76137 11.1214 8.14734 10.676C8.53331 10.2306 8.93116 9.79708 9.33791 9.37248C9.74763 8.95085 10.1692 8.53812 10.5997 8.14024C11.0332 7.74236 11.4756 7.35636 11.9298 6.98223C12.3841 6.61108 12.8502 6.2518 13.3253 5.9044C13.8003 5.55996 14.2843 5.22741 14.7801 4.91267C15.2759 4.59792 15.7806 4.29506 16.2943 4.01001C16.8079 3.72496 17.3305 3.45476 17.8619 3.20238C18.3934 2.94999 18.9337 2.71542 19.483 2.49569C19.5364 2.47491 19.5869 2.45412 19.6404 2.43334C31.3768 -2.14822 45.8715 1.64055 53.864 11.3916C61.8566 21.1426 62.7325 36.0987 55.9305 46.7138C49.1285 57.3289 35.1742 62.7834 22.9775 59.5944C22.4193 59.4489 21.8671 59.2856 21.3178 59.1045C20.7686 58.9234 20.2252 58.7244 19.6879 58.5106C19.1505 58.2968 18.622 58.0652 18.0994 57.8188C17.5769 57.5723 17.0633 57.3081 16.5556 57.0319C16.0479 56.7558 15.552 56.4618 15.0621 56.156C14.5723 55.8502 14.0913 55.5295 13.6192 55.194C13.1471 54.8584 12.684 54.511 12.2327 54.1518C11.7814 53.7925 11.336 53.4184 10.9055 53.0324C10.4721 52.6464 10.0505 52.2485 9.64075 51.8417C9.23102 51.4319 8.83021 51.0133 8.44127 50.5827C8.05233 50.1522 7.67527 49.7098 7.31305 49.2614C6.94786 48.8101 6.59752 48.3498 6.25905 47.8807C5.92059 47.4116 5.594 46.9305 5.27928 46.4436C4.96754 45.9566 4.66767 45.4608 4.38264 44.956C4.09762 44.4512 3.82447 43.9405 3.56914 43.4239C3.31083 42.9072 3.07034 42.3816 2.84173 41.8502C2.61609 41.3187 2.40232 40.7812 2.20636 40.2379C2.01041 39.6945 1.8293 39.1452 1.666 38.5929C1.50271 38.0406 1.35426 37.4794 1.22362 36.9182C1.09299 36.3541 0.980165 35.7899 0.882188 35.2198C0.78718 34.6497 0.707017 34.0767 0.647637 33.5006C0.60607 33.073 0.570442 32.6544 0.54669 32.2327ZM26.3978 34.9704C26.1415 35.2267 25.7643 35.3072 25.4969 35.0625C24.4843 34.1353 23.5446 33.2713 22.6004 32.4139C20.9348 30.8996 19.3138 29.3288 17.5858 27.8887C15.9766 26.5466 13.4826 27.4226 12.9928 29.4268C12.678 30.7095 13.1085 31.7636 14.0735 32.6395C17.3067 35.5732 20.534 38.5187 23.7613 41.4612C25.3557 42.9131 26.9203 42.8805 28.4613 41.3513C34.6487 35.2109 40.8331 29.0705 47.0175 22.9301C47.2105 22.7371 47.4065 22.5441 47.5816 22.3333C48.9652 20.6735 48.2437 18.1763 46.1832 17.5201C44.8561 17.0955 43.7902 17.5587 42.8431 18.5089C37.3653 24.002 31.8786 29.4803 26.3978 34.9704Z"
                  fill="#038654"
                />
              </svg>
            </div>
            <h2>Booking Scheduled !</h2>
            <p>
              Dear Customer you have successfully Accepted
              <br /> the request
            </p>
            <div className="comman-pop-action">
              <button className="btn-fill">Cancel</button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </Layout>
  );
}
