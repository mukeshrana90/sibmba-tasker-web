import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import NavDropdown from "react-bootstrap/NavDropdown";
import Dropdown from "react-bootstrap/Dropdown";

export default function Footer({ isActive, setIsActive, setShow, show }) {
  return (
    <section className="footer-main-sec">
      <Container>
        <div className="footer-links">
          <div>
            <img src={require("../..//Assets/Images/dark-logo.png")} />
            <p>
              Complete Your Routine Tasks <br />Faster & Smarter With Simba Tasker!
            </p>
          </div>
          {/* <div>
            <h2>Company</h2>
            <ul>
              <li className="mb-3">
                <Link to="">About</Link>
              </li>
              <li className="mb-3">
                <Link to="">Features</Link>
              </li>
              <li className="mb-3">
                <Link to="">Works </Link>
              </li>
              <li>
                <Link to="">Career </Link>
              </li>
            </ul>
          </div> */}
          <div className="link">
            <h2>Link</h2>
            <ul>
              {/* <li className="mb-3">
                <Link to="/contact-us">Customer Support</Link>
              </li> */}
              <li className="mb-3">
                <Link
                  to="https://simbatasker.com/"
                  onClick={() =>
                    window.scrollTo({
                      top: document.body.scrollHeight,
                      behavior: "instant",
                    })
                  }
                >
                  Contact us{" "}
                </Link>
              </li>
              <li className="mb-3">
                <Link
                  to="https://simbatasker.com/terms-and-conditions"
                  target="_blank"
                >
                  Terms & Conditions{" "}
                </Link>
              </li>
              <li>
                <Link
                  to="https://simbatasker.com/privacy-policy"
                  target="_blank"
                >
                  Privacy Policy{" "}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Download our app </h2>
            <div className="store d-flex">
              <a href="https://apps.apple.com/in/app/simbatasker/id6736746247" target="_blank" rel="noopener noreferrer">
                <img src={require("../../Assets/Images/App Store.png")} alt="App Store" />
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.simbatasker.app&pcampaignid=web_share" target="_blank" rel="noopener noreferrer">
                <img src={require("../../Assets/Images/play-store.png")} alt="Play Store" />
              </a>
            </div>
          </div>
        </div>

        <div className="copyright-text">
          <p>© Copyright 2025, All Rights Reserved by SimbaTasker</p>
        </div>
      </Container>
    </section>
  );
}
