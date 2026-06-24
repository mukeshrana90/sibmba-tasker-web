import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import CorporatePageShell from "../../CommanComponents/CorporatePageShell";
import PaginationComponent from "../../CommanComponents/PaginationComponent";
import Loader from "../../CommanComponents/Loader";
import CorporateActions from "../../Redux/Actions/corporateActions";
import {
  handleUserImageError,
  userImageUrl,
  formatDisplayTitle,
  providerDisplayName,
} from "../../utils/landingUtils";

export default function CorporateProDetails() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const { categoryId } = useParams();
  const [corporateDetail, setCorporateDetail] = useState([]);

  useEffect(() => {
    const latitude = localStorage.getItem("latitude");
    const longitude = localStorage.getItem("longitude");
    const fetchData = async () => {
      try {
        if (categoryId) {
          setLoading(true);
          const payload = {
            page,
            limit,
            category_id: categoryId,
            lat: latitude,
            lng: longitude,
          };

          const resultAction = await dispatch(
            CorporateActions.getNearbyCorporatPro(payload)
          ).unwrap();
          const response = resultAction.data;
          setCorporateDetail(Array.isArray(response) ? response : []);
          if (response?.totalPages) {
            setTotalPages(response.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch nearby corporate users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, page, limit, categoryId]);

  const categoryName = formatDisplayTitle(
    corporateDetail?.[0]?.corporateCategoryId?.name,
    "Corporate Category"
  );

  return (
    <CorporatePageShell title={categoryName} crumbLabel="Corporate Pro">
      {loading ? (
        <Loader />
      ) : Array.isArray(corporateDetail) && corporateDetail.length > 0 ? (
        <>
          <div className="corp-user-grid">
            {corporateDetail.map((ele) => (
              <button
                key={ele._id}
                type="button"
                className="corp-user-card"
                onClick={() =>
                  navigate(`/corporate/corporate-business/${ele._id}`)
                }
              >
                <img
                  src={userImageUrl(ele)}
                  alt={providerDisplayName(ele)}
                  onError={handleUserImageError}
                />
                <div className="corp-user-body">
                  <h3>{providerDisplayName(ele)}</h3>
                  {ele.address && (
                    <p className="corp-user-loc">{ele.address}</p>
                  )}
                </div>
                <span className="corp-user-arrow" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </button>
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
        <p className="corp-empty">No corporate suppliers found in this category.</p>
      )}
    </CorporatePageShell>
  );
}
