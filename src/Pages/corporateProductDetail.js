import { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";
import Slider from "react-slick";
import Layout from "../Components/Layout/Layout";
import ChatIcon from "../Assets/Images/chat.svg";
import { toast } from "react-toastify";
import moment from "moment";
import { Modal } from "react-bootstrap";
import { Form } from "react-bootstrap";
import ProductPaymentModal from "../CommanComponents/Modals/ByProductModel";
export default function CorporateProductDetailPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const productDetails = useSelector(
    (state) => state.service.getCorporateList?.data
  );
  const [paymentshow, setPaymentShow] = useState(false);
  const [boookingId, setBookingId] = useState(null);
  const [selectedBoooking, setSelectedBoooking] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [bookingState, setBookingState] = useState();

  const sliderSettings = {
    dots: true,
    arrows: false,
    infinite: productDetails?.images?.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 1, slidesToScroll: 1, infinite: true },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  useEffect(() => {
    if (id) {
      dispatch(CustomerActions.corpoInfoProductListUser({ productId: id }));
    }
  }, [dispatch, id]);
  const handlePaymentOpen = (id) => {
    setPaymentShow(true);
    setBookingId(id);
  };
  const handlePaymentClose = (id) => {
    setPaymentShow(false);
    setBookingId("");
  };

  const handleFeedbackOpen = () => setShowFeedback(true);
  const handleFeedbackClose = () => {
    setShowFeedback(false);
    setRating(0);
    setMessage("");
  };
  const handleThankYouClose = () => {
    setShowThankYou(false);
    navigate("/bookings");
  };

  const handleSubmitFeedback = () => {
    if (!rating || !message) {
      toast.error("Please give rating and message.");
      return;
    }
    const feedbackData = {
      ProductId: productDetails?.id,
      type: 1,
      message: message,
      rating: rating,
      // service_id: bookingState?.serviceSubCategory?._id,
      serviceProviderId: productDetails?._id,
      category_id: productDetails?.categoryId?._id,
    };
    dispatch(CustomerActions.feedbackActions(feedbackData));
    handleFeedbackClose();
    setShowThankYou(true);
  };
  const renderModalContent = () => {
    if (showFeedback) {
      return (
        <div className="comman-small-pop">
          <div className="feedback-profile">
            <img
              src={
                productDetails?.categoryId?.images?.length > 0
                  ? `${process.env.REACT_APP_API_URL}/user/${productDetails?.categoryId?.images}`
                  : ""
              }
            />
            <div className="">
              <h4>{productDetails?.categoryId?.name || ""}</h4>
              <p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="16"
                  viewBox="0 0 15 16"
                  fill="none"
                >
                  <path
                    d="M0.00701307 5.86261C5.01071 5.86261 9.99052 5.86261 14.9837 5.86261C14.9866 5.92814 14.9923 5.98731 14.9923 6.04738C14.9923 8.68428 14.9799 11.3221 15 13.959C15.0066 14.8474 14.3062 15.5036 13.3811 15.5C9.44772 15.4845 5.51338 15.4936 1.57999 15.4936C0.788722 15.4936 0.184761 15.0431 0.0347264 14.3395C0.0117912 14.2311 0.0079687 14.1183 0.0079687 14.0072C0.00701307 11.3421 0.00701307 8.677 0.00701307 6.01188C0.00701307 5.96637 0.00701307 5.92177 0.00701307 5.86261ZM2.25753 12.6283C2.25658 12.6283 2.25658 12.6283 2.25562 12.6283C2.25562 12.7457 2.25371 12.8622 2.25562 12.9796C2.26518 13.401 2.56047 13.6932 3.00293 13.7087C3.25426 13.7178 3.50654 13.7187 3.75788 13.7078C4.18409 13.6905 4.48034 13.4101 4.5004 13.0051C4.51187 12.7602 4.51187 12.5145 4.5004 12.2696C4.48034 11.8555 4.17549 11.5779 3.74163 11.5697C3.48456 11.5651 3.22654 11.5633 2.96948 11.5715C2.57576 11.5842 2.27664 11.87 2.25849 12.2432C2.25275 12.3725 2.25753 12.5008 2.25753 12.6283ZM7.49823 11.5715C7.49823 11.5706 7.49823 11.5706 7.49823 11.5697C7.37495 11.5697 7.25263 11.5669 7.12935 11.5706C6.68976 11.5815 6.38205 11.8755 6.37631 12.2924C6.37249 12.5208 6.37345 12.7493 6.37631 12.9778C6.38109 13.3865 6.67638 13.6868 7.10642 13.7078C7.36922 13.7205 7.63297 13.7205 7.89577 13.7078C8.30574 13.6877 8.60772 13.4019 8.6211 13.026C8.63065 12.7648 8.63161 12.5017 8.62014 12.2405C8.60485 11.8773 8.29905 11.5915 7.91871 11.5742C7.77918 11.566 7.6387 11.5715 7.49823 11.5715ZM12.7399 8.71614C12.7408 8.71614 12.7418 8.71614 12.7427 8.71614C12.7427 8.59872 12.7456 8.48221 12.7427 8.36479C12.7322 7.95065 12.4436 7.65847 12.0098 7.63935C11.7527 7.62843 11.4947 7.62843 11.2376 7.63935C10.8133 7.65665 10.5152 7.94063 10.498 8.34386C10.4874 8.58871 10.4865 8.83447 10.498 9.07932C10.518 9.49164 10.8248 9.76926 11.2596 9.77654C11.5224 9.78109 11.7862 9.78382 12.049 9.7729C12.4236 9.75743 12.7189 9.47253 12.7389 9.11663C12.7466 8.98465 12.7399 8.84994 12.7399 8.71614ZM7.49727 9.77654C7.49727 9.77745 7.49727 9.77745 7.49727 9.77836C7.62628 9.77836 7.75529 9.782 7.88335 9.77745C8.31052 9.7638 8.61632 9.46889 8.62301 9.05929C8.62683 8.83083 8.62587 8.60236 8.62301 8.3739C8.61823 7.96248 8.32581 7.66211 7.89577 7.64117C7.63297 7.62843 7.36922 7.62934 7.10642 7.64117C6.69741 7.65938 6.3916 7.94609 6.37727 8.32019C6.36771 8.58143 6.36771 8.84448 6.37727 9.10571C6.3916 9.46798 6.69549 9.75652 7.07488 9.77563C7.21536 9.782 7.35679 9.77654 7.49727 9.77654ZM3.36511 9.77836C3.48839 9.77836 3.61071 9.78018 3.73398 9.77836C4.1774 9.76926 4.48416 9.49073 4.50136 9.06839C4.51092 8.82901 4.51187 8.58871 4.50136 8.34932C4.4832 7.93699 4.18218 7.653 3.74832 7.63844C3.49699 7.63025 3.2447 7.62934 2.99337 7.63935C2.56047 7.65665 2.26518 7.94882 2.25658 8.36024C2.2518 8.59417 2.2518 8.82809 2.25658 9.06202C2.26613 9.48254 2.56907 9.76744 3.01439 9.77745C3.13098 9.78109 3.24852 9.77836 3.36511 9.77836ZM11.638 11.5715C11.638 11.5706 11.638 11.5697 11.638 11.5697C11.5148 11.5697 11.3924 11.5678 11.2692 11.5697C10.8162 11.5779 10.5104 11.8609 10.496 12.2915C10.4884 12.5254 10.4874 12.7593 10.496 12.9932C10.5123 13.4047 10.8114 13.6923 11.2443 13.7087C11.4956 13.7178 11.7479 13.7187 11.9993 13.7087C12.4417 13.6914 12.7341 13.3992 12.7418 12.975C12.7456 12.7302 12.7485 12.4844 12.7389 12.2396C12.7236 11.8737 12.4245 11.5906 12.0413 11.5724C11.9075 11.566 11.7728 11.5715 11.638 11.5715Z"
                    fill="#545454"
                  />
                  <path
                    d="M10.13 1.58186C10.0813 2.13618 10.1855 2.6368 10.648 3.0109C10.9299 3.23936 11.2586 3.35405 11.6313 3.35223C11.9391 3.35041 12.22 3.26758 12.4713 3.10101C12.7284 2.9308 12.9358 2.71235 13.0161 2.42381C13.0906 2.15347 13.1145 1.87039 13.1613 1.58459C14.1666 1.42803 14.9856 2.07883 14.9904 3.06733C14.9933 3.70266 14.9914 4.3389 14.9904 4.97424C14.9904 5.02339 14.9856 5.07254 14.9828 5.13261C9.99052 5.13261 5.00689 5.13261 0.0051018 5.13261C0.0051018 5.01246 0.0051018 4.90142 0.0051018 4.79128C0.0051018 4.22786 0.0242145 3.66443 0.00127926 3.10192C-0.0350348 2.20535 0.706537 1.52178 1.61917 1.57002C1.69466 1.57366 1.77111 1.57093 1.87623 1.57093C1.87623 1.69563 1.87432 1.81487 1.87623 1.93411C1.88866 2.66501 2.47255 3.28396 3.20456 3.34404C4.01112 3.41048 4.69822 2.93262 4.84348 2.18806C4.8817 1.99327 4.87023 1.7903 4.88266 1.58095C6.62478 1.58186 8.36116 1.58186 10.13 1.58186Z"
                    fill="#545454"
                  />
                  <path
                    d="M4.12484 1.57457C4.12484 1.70291 4.12962 1.83126 4.12388 1.95869C4.10668 2.32186 3.80948 2.61404 3.43392 2.64044C3.04688 2.66774 2.68757 2.42017 2.64839 2.05062C2.61494 1.73204 2.61494 1.40436 2.64934 1.08579C2.68852 0.724431 3.04115 0.481403 3.4234 0.502338C3.79801 0.522363 4.10286 0.812722 4.12293 1.17408C4.13153 1.30697 4.12484 1.44077 4.12484 1.57457Z"
                    fill="#545454"
                  />
                  <path
                    d="M10.8735 1.57275C10.8735 1.44441 10.8687 1.31607 10.8745 1.18864C10.8888 0.825465 11.1851 0.530555 11.5597 0.502338C11.9477 0.473211 12.3098 0.71897 12.35 1.0867C12.3844 1.40527 12.3844 1.73295 12.3509 2.05153C12.3118 2.42017 11.9505 2.63953 11.5635 2.63953C11.1889 2.61222 10.8907 2.31913 10.8754 1.95595C10.8687 1.82943 10.8735 1.70109 10.8735 1.57275Z"
                    fill="#545454"
                  />
                </svg>
                {`${bookingState?.slotTime}, ${moment(
                  bookingState?.date
                ).format("DD MMM")}`}
              </p>
              <p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="16"
                  viewBox="0 0 14 16"
                  fill="none"
                >
                  <path
                    d="M7.46864 0.512424C8.53944 0.56874 9.59239 0.813882 10.5204 1.24785C12.5618 2.20302 13.9209 4.03606 13.9964 5.93314C14.0582 7.49344 13.3141 9.00625 12.3682 10.3689C11.0888 12.213 9.41942 13.8793 7.46452 15.2894C7.32861 15.3877 7.17622 15.4893 6.99501 15.4992C6.75202 15.5124 6.55022 15.3612 6.38136 15.2209C4.7779 13.8892 3.19366 12.5199 1.98283 10.942C0.953211 9.60143 0.198158 8.09083 0.0238096 6.51177C-0.127201 5.14472 0.449385 3.75006 1.48999 2.66569C2.0954 2.03517 2.86144 1.50403 3.7373 1.13301C4.87812 0.651558 6.18504 0.445065 7.46864 0.512424ZM10.8842 6.01596C10.7922 4.27457 9.00208 2.91415 6.89479 2.9804C4.72711 3.04887 3.02755 4.49321 3.11129 6.19706C3.19778 7.93182 4.99892 9.30329 7.10072 9.23372C9.2739 9.16084 10.9748 7.71429 10.8842 6.01596Z"
                    fill="#545454"
                  />
                </svg>
                {bookingState?.address || "-"}
              </p>
            </div>
          </div>
          <h3 className="mb-3">
            How would you rate the experience and service?
          </h3>
          <div className="write-review-box">
            <div className="rating-stars">
              <ul>
                {[1, 2, 3, 4, 5].map((star) => (
                  <li key={star} onClick={() => setRating(star)}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M11.1418 8.70889C10.9605 8.89383 10.8772 9.16128 10.9185 9.42358L11.5407 13.0486C11.5932 13.3558 11.47 13.6668 11.2257 13.8443C10.9864 14.0285 10.6679 14.0506 10.4069 13.9033L7.30696 12.2013C7.19917 12.1409 7.07949 12.1085 6.957 12.1048H6.76733C6.70154 12.1151 6.63715 12.1372 6.57835 12.1711L3.47776 13.8812C3.32448 13.9622 3.1509 13.991 2.98082 13.9622C2.56648 13.8797 2.29001 13.4642 2.3579 13.0258L2.98082 9.40074C3.02212 9.13623 2.93883 8.8673 2.75755 8.67942L0.230183 6.10064C0.0188106 5.88476 -0.0546798 5.56058 0.0419076 5.26807C0.135695 4.9763 0.375064 4.76337 0.664126 4.71547L4.14267 4.18425C4.40724 4.15551 4.63961 3.98605 4.75859 3.73554L6.29139 0.42734C6.32779 0.353661 6.37468 0.285876 6.43137 0.228406L6.49436 0.17683C6.52726 0.138517 6.56506 0.106835 6.60705 0.0810472L6.68334 0.0515755L6.80232 0H7.09699C7.36015 0.0287349 7.59182 0.194513 7.7129 0.442076L9.266 3.73554C9.37799 3.97647 9.59566 4.14372 9.84693 4.18425L13.3255 4.71547C13.6194 4.75968 13.8651 4.97335 13.9624 5.26807C14.0541 5.56352 13.975 5.88771 13.7594 6.10064L11.1418 8.70889Z"
                        fill={star <= rating ? "#FFC107" : "#E0E0E0"}
                      />
                    </svg>
                  </li>
                ))}
              </ul>
            </div>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Write a description here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="comman-pop-action">
            <button className="btn-fill w-100" onClick={handleSubmitFeedback}>
              Submit Feedback
            </button>
          </div>
        </div>
      );
    }

    if (showThankYou) {
      return (
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
          <h3>Thanks for giving your feedback</h3>
          <p>
            Your feedback means a lot for the rating and
            <br /> improvement for our service.
          </p>
          <div className="comman-pop-action">
            <button className="btn-fill" onClick={handleThankYouClose}>
              Done
            </button>
          </div>
        </div>
      );
    }
    return null;
  };
  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <div className="bookings-details-title mt-5">
            <h2>Product Details</h2>
          </div>
          <Row className="quotation-requests-wrap mt-3">
            <Col lg={12}>
              <div className="service-detail-card pt-3">
                {productDetails?.images?.length > 0 ? (
                  <Slider {...sliderSettings}>
                    {productDetails.images.map((image, index) => (
                      <div key={index} className="card-box task-details">
                        <img
                          src={`${process.env.REACT_APP_API_URL}/products/${image}`}
                          alt={productDetails.name}
                          style={{ maxWidth: "200px", margin: "0 auto" }}
                        />
                      </div>
                    ))}
                  </Slider>
                ) : (
                  <img
                    src={require("../Assets/Images/living-room-cleaning.png")}
                    alt="Default"
                  />
                )}
                <div>
                  <h3>{productDetails?.name}</h3>
                  <p>
                    Description:{" "}
                    {productDetails?.description || "No description provided."}
                  </p>
                  <div className="book-service-action-btn">
                    <h4>Price: ${productDetails?.price || "N/A"}</h4>
                  </div>
                  <div className="book-now-product d-flex"></div>
                </div>
              </div>
            </Col>
            <Col>
              <div className="d-flex justify-content-center align-items-center book-service-action-btn gap-3 mt-5">
                <button
                  className="view-more-btn"
                  onClick={() => {
                    const product = {
                      image: productDetails?.images?.[0]
                        ? `${process.env.REACT_APP_API_URL}/products/${productDetails.images[0]}`
                        : "/Assets/Images/default-task.png",
                      name: productDetails?.name || "-",
                      description:
                        productDetails?.description ||
                        "No description available.",
                      price: `$${productDetails?.price || "0"}`,
                      id: productDetails?._id || "Flexible",
                    };

                    localStorage.setItem(
                      "preloadTaskMessage",
                      JSON.stringify(product)
                    );
                    localStorage.setItem("reciverID", productDetails?.user_id);
                    navigate("/messages");
                  }}
                >
                  <img src={ChatIcon} alt="Chat" /> Direct Chat
                </button>

                <div className="d-flex justify-content-center align-item-center book-service-action-btn">
                  { (
                    <button
                      className="primaryBtn"
                      onClick={() => {
                        handlePaymentOpen(productDetails?._id);
                        setSelectedBoooking(productDetails);
                      }}
                    >
                      Buy Now
                    </button>
                  )}
                </div>
                <ProductPaymentModal
                  paymentshow={paymentshow}
                  handlePaymentClose={handlePaymentClose}
                  productId={productDetails?._id}
                  data={selectedBoooking}
                  copId={productDetails?.categoryId?._id}
                />
                <Modal
                  show={showFeedback || showThankYou}
                  onHide={
                    showFeedback ? handleFeedbackClose : handleThankYouClose
                  }
                  centered
                >
                  <Modal.Header className="border-none pb-0">
                    <Modal.Title>{showFeedback ? "Feedback" : ""}</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>{renderModalContent()}</Modal.Body>
                </Modal>
            </div>
          </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
