import React, { useEffect, useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";

export default function TrainingMaterial() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const trainingDetail = useSelector((e) => e.UserSlice.trainingListData);

  useEffect(() => {
    dispatch(CustomerActions.trainingListing());
  }, [dispatch]);

  useEffect(() => {
    if (trainingDetail?.length > 0 && !selectedTraining) {
      setSelectedTraining(trainingDetail[0]);
    }
  }, [trainingDetail, selectedTraining]);

  const handleSelectTraining = (training) => {
    setSelectedTraining(training);
  };

  return (
    <Layout>
      <section className="service-detail-sec mb-5">
        <Container>
          <Row>
            <Col lg={12}>
              <div className="bookings-details-title">
                <h2>Training Material</h2>
              </div>
              <div className="training-material-cards" style={{ display: 'flex', gap: '20px', overflowX: 'auto' }}>
                {trainingDetail?.map((training) => (
                  <div
                    key={training._id}
                    className={`training-material-item ${selectedTraining?._id === training._id ? 'active' : ''}`}
                    onClick={() => handleSelectTraining(training)}
                    style={{ cursor: 'pointer', flex: '0 0 auto' }}
                  >
                    <img
                      src={require("../Assets/Images/living-room-cleaning.png")}
                      alt={training.title}
                    />
                    <p>{training.title}</p>
                    <h3>{training.title}</h3>
                  </div>
                ))}
              </div>
              {selectedTraining && (
                <div className="service-detail-card pt-3">
                  <video
                    src={`${"https://api.simbatasker.com"}${selectedTraining.video}`}
                    controls
                    style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', boxShadow: '0px 1px 2px 0px #1018280D'}}
                  />
                  <div>
                    <h3>{selectedTraining.title}</h3>
                    <p>{selectedTraining.description}</p>
                  </div>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}