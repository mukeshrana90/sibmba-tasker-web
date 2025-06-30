import moment from "moment";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStatusLabel } from "../utils/CommonFunction";
import CustomerBookServiceModal from "./Modals/CustomerBookServiceModal";

const getStatusColor = (status) => {
  const statusMap = {
    1: "yellow",
    2: "green",
    3: "red",
    4: "green",
    5: "red",
  };

  return statusMap[status] || "N/A";
};

const BookingListTab = ({ data, handleOpen, setSelectedBoooking }) => {
  const navigate = useNavigate();

  console.log("data", data);
  return (
    <>
      <li>
        <div
          className="bookings-card-item"
          onClick={() => navigate(`/user-booking-detail/${data?._id}`)}
        >
          <img
            src={
              data?.serviceSubCategory?.images[0]
                ? `${process.env.REACT_APP_API_URL}/user/${data?.serviceSubCategory?.images[0]}`
                : require("../Assets/Images/light-replace-&-repair.png")
            }
          />
          <div className="bookings-card-data">
            <div>
              <div className="">
                <h3>
                  {data?.serviceSubCategory?.serviceSubCategoryName || "N/A"}
                </h3>
                <p>

                  {`${data?.slotTime}, ${moment(data?.date).format(
                    "DD MMM"
                  )}`}
                </p>
              </div>
              {/* Pending */}
              {data?.status === 1 && (
                <div className="bookings-card-edit">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpen(data?.serviceSubCategory?._id)
                      setSelectedBoooking(data)
                    }}
                  >
                    Edit
                  </button>
                </div>
              )}

              {/* confirmed */}
              {(data?.status === 2 || data?.status === 4) && (
                <div
                  className="provider-view-pro"
                  // onClick={() => navigate("/service-provider")}
                >
                  <img
                    src={`${process.env.REACT_APP_API_URL}${data?.serviceProvider?.profile_image}`}
                    alt="categories-img"
                  />
                  <div>
                    <h5>{data?.serviceProvider?.company_name}</h5>
                    <p>{data?.serviceProvider?.street_address}</p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <div className="status-booking">
                Status:
                <span className={getStatusColor(data?.status)}>
                  {getStatusLabel(data?.status)}
                </span>
              </div>

              {(data?.status === 2 || data?.status === 4) && (
                <div className="chat-btn-card">
                  <button className="">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                    >
                      <path
                        d="M13.8089 0.0330579C16.6576 -0.155486 19.5652 0.463174 22.0556 1.87136C26.3494 4.30476 29.2569 9.03015 29.5036 13.9735C29.7503 18.9169 27.3303 23.9075 23.3009 26.7651C19.2715 29.6227 13.7677 30.2414 9.2097 28.3559C8.59296 28.1026 7.91747 27.8021 7.29485 28.0319C6.97179 28.1497 6.71922 28.4031 6.4549 28.6211C4.92185 29.8938 2.71919 30.318 0.82196 29.7052C1.55618 27.8728 2.09069 25.9166 1.96734 23.9487C1.90273 22.9412 1.67365 21.9513 1.39171 20.9791C1.10977 19.9952 0.77497 19.0289 0.504776 18.039C0.240457 17.0845 0.0290018 16.1006 0.00550674 15.1048C-0.0062408 14.6335 -0.0121151 14.0973 0.128855 13.6436C0.187593 13.4433 0.187593 13.2135 0.211088 13.0014C0.240457 12.7775 0.269823 12.5536 0.305066 12.3356C0.45191 11.4459 0.686861 10.5739 0.998171 9.7313C1.30948 8.88874 1.69715 8.06976 2.14943 7.29201C2.60171 6.51427 3.12448 5.77777 3.71185 5.09429C4.29336 4.41082 4.93947 3.77448 5.63257 3.20885C6.32568 2.64322 7.07752 2.1365 7.88223 1.70639C9.7031 0.728315 11.7413 0.168574 13.8089 0.0330579ZM24.7928 14.7749C24.7987 13.6024 23.8413 12.6302 22.6724 12.6243C21.5035 12.6184 20.5343 13.5788 20.5226 14.7454C20.5108 15.9061 21.48 16.8901 22.643 16.896C23.8119 16.9137 24.7869 15.9474 24.7928 14.7749ZM16.9337 14.7749C16.9396 13.5906 15.9998 12.6302 14.825 12.6243C13.6503 12.6184 12.6928 13.5611 12.687 14.7454C12.6752 15.9238 13.6268 16.8901 14.7957 16.896C15.9645 16.9137 16.9278 15.9533 16.9337 14.7749ZM4.83374 14.7454C4.82787 15.9238 5.76767 16.8901 6.94243 16.9019C8.11131 16.9137 9.0746 15.9592 9.08048 14.7808C9.09223 13.6024 8.14655 12.6361 6.97179 12.6302C5.79704 12.6184 4.83961 13.567 4.83374 14.7454Z"
                        fill="#252525"
                      />
                      <path
                        d="M40 25.4453C39.8825 26.1995 39.812 26.9713 39.6299 27.7137C39.3304 28.9392 38.931 30.1353 38.6079 31.355C37.8796 34.0948 38.0734 36.7697 39.207 39.374C39.2482 39.4683 39.2834 39.5625 39.3304 39.7039C38.5198 39.9868 37.7034 40.0516 36.8751 39.9632C35.4889 39.8159 34.2731 39.2738 33.251 38.3193C32.7165 37.8185 32.1526 37.789 31.4948 38.0895C25.3508 40.8882 18.2906 39.2797 13.9557 34.083C13.4329 33.4584 12.9924 32.7691 12.4579 32.0267C18.361 32.5923 23.4066 30.972 27.436 26.7121C31.4595 22.458 32.8164 17.332 31.9588 11.5343C32.0763 11.5814 32.1703 11.605 32.2525 11.6521C36.5169 14.0148 39.0778 17.5853 39.8473 22.4286C39.8943 22.735 39.9413 23.0413 39.9882 23.3477C40 24.0371 40 24.7441 40 25.4453Z"
                        fill="#252525"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </li>


    </>
  );
};

export default BookingListTab;
