import  { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../CommanComponents/Loader";
import CustomerActions from "../Redux/Actions/CustomerActions";
import PaginationComponent from "../CommanComponents/PaginationComponent";


export default function ServicePro() {
    const Navigate = useNavigate();
    const dispatch = useDispatch();

    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem("token");
    const postTasksList = useSelector(
        (state) => state.service.getPostTaskService
    );


    const categories = useSelector((e) => e.UserSlice.categories);

    useEffect(() => {
        const fetchCategoryAndServices = async () => {
            setLoading(true);
            try {
                const [categoryResponse] = await Promise.all([
                    dispatch(CustomerActions.getCategories({ page, limit })),
                ]);
            } catch (error) {
                console.error("Error fetching category and services:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCategoryAndServices();
    }, [dispatch, page]);


    return (
        <Layout>
            <section className="search-results-sec">
                <Container>
                    <Row>
                        <Col lg={12}>
                            <div className="headings">
                                <div className="taskk ml-3" >
                                    <div>
                                        <h2 className="ml-3">Service Providers</h2>
                                    </div>
                                </div>
                                <section className="category-services-sec pt-0 mt-3">
                                    <Container>
                                        <div className="category-services-lists">
                                            {loading ? ( <Loader />) : Array.isArray(categories?.allCat) &&
                                                categories?.allCat.length > 0 ? (
                                                <>
                                                    <div className="services-list-browse">
                                                        {Array.isArray(categories?.allCat) &&
                                                            categories?.allCat?.length > 0 &&
                                                            categories?.allCat.map((ele, index) => {
                                                                return (
                                                                    <div key={index}>
                                                                        <>
                                                                            <img
                                                                                onClick={() => Navigate(`/serviceprocategory/${ele?._id}`)}
                                                                                className="point-cursor"
                                                                                src={`${process.env.REACT_APP_API_URL}${ele?.image}`}
                                                                                alt="categories-img"
                                                                            />
                                                                        </>
                                                                        <h3>{ele?.service_category_name}</h3>
                                                                        {/* <p>{ele?.desc}</p> */}
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                    {Array.isArray(categories?.allCat) &&
                                                        categories?.totalCount > 10 && (
                                                            <div className="pagination-flexs">
                                                                <div></div>
                                                                <div className="mt-5">
                                                                    <PaginationComponent
                                                                        page={page}
                                                                        setPage={setPage}
                                                                        totalPages={categories?.totalPages}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{ height: "300px" }}>
                                                        <h3 className="text-center mt-5"> No Data Found </h3>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </Container>
                                </section>
                            </div>
                        </Col>
                    </Row>
                </Container>

            </section>
        </Layout>
    );
}
