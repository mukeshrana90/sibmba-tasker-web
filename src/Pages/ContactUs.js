import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Layout from "../Components/Layout/Layout";

import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

export default function ContactUs() {
  const Navigate = useNavigate();

  return (
    <Layout>
      <section className="contact-us-sec">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <div className="contact-us-box">
                <h2>Contact Us</h2>
                <p>We’d love to hear from you. Please fill out this form.</p>
                <Form>
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Name</Form.Label>
                    <Form.Control type="text" placeholder="Enter name" />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" placeholder="Enter email" />
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control type="text" placeholder="Enter subject" />
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="formBasicPassword">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Write a description here..."
                    />
                  </Form.Group>
                  <div className="contact-action-btn">
                    <button>Verify</button>
                  </div>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </Layout>
  );
}
