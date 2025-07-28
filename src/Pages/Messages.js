import { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Layout from "../Components/Layout/Layout";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import ChatList from "../Components/ChatList";
import MainChat from "../Components/MainChat";
import { ChatProvider } from "../context/ChatProvider";
import io from 'socket.io-client';
const socket = io(`${process.env.REACT_APP_API_URLL}`); 

export default function Messages() {
  const sender_id = localStorage.getItem('userId');
  const reciverID = localStorage.getItem('reciverID');
  const [show, setShow] = useState(false);
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

  return (
    <ChatProvider>
      <Layout>
        <section className="service-detail-sec">
          <Container>
            <Row>
              <Col lg={12}>
                <div class="bookings-details-title">
                  <h2>Messages</h2>
                </div>
                <div className="message-chat-contain">
                  <ChatList />
                  <MainChat
                    sender_id={sender_id}
                    reciverID={reciverID}
                    socket={socket}
                  />
                </div>
              </Col>
            </Row>
          </Container>
        </section>

        <Modal show={show} onHide={handleClose} centered>
          <Modal.Header closeButton className="border-none pb-0">
            <Modal.Title>Book Service</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="book-service-view">
              <img src={require("../Assets/Images/living-room-cleaning.png")} />
              <p>Living Room Cleaning</p>
            </div>
            <div className="book-service-select">
              <h3>Select Date</h3>
              <ul>
                <li>
                  <p>Fri</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>SAT</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>SUN</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>MON</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>TUE</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>WED</p>
                  <h5>07</h5>
                </li>
                <li>
                  <p>THR</p>
                  <h5>07</h5>
                </li>
              </ul>
            </div>
            <div className="book-service-select">
              <h3>Select Time</h3>
              <ul>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
                <li>
                  <p className="mb-0">08 - 09 AM</p>
                </li>
              </ul>
            </div>

            <div className="">
              <Form>
                <Form.Group controlId="exampleForm.ControlTextarea1">
                  <Form.Label>Message</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder="Enter your message"
                  />
                </Form.Group>
              </Form>
            </div>
            <div className="book-service-action">
              <button onClick={handleClose}>Cancel</button>
              <button onClick={handleClose}>Book </button>
            </div>
          </Modal.Body>
        </Modal>
      </Layout>
    </ChatProvider>
  );
}
