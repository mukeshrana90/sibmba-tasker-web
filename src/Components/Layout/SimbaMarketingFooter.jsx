import React from "react";
import { Link } from "react-router-dom";
import LandingSectionLink from "../../CommanComponents/Landing/LandingSectionLink";

export default function SimbaMarketingFooter() {
  return (
    <footer className="simba-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-about">
            <Link to="/" className="logo-foot simba-footer-logo">
              <img
                src={require("../../Assets/Images/dark-logo.png")}
                alt="Simba Tasker"
                className="logo-img"
              />
            </Link>
            <p>
              The secure, reliable and hassle-free way to find or provide
              services across Zimbabwe.
            </p>
            <div className="app-badges">
              <a
                href="https://play.google.com/store/apps/details?id=com.simbatasker.app&pcampaignid=web_share"
                className="app-badge"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <path d="M3 3.5v17l9-8.5-9-8.5Zm10.5 9.9 2.8 2.6-9.6 5.5 6.8-8.1Zm0-2.8L6.7 2.5l9.6 5.5-2.8 2.6Zm1.3 1.4 3.4-3.2 2.8 1.6c1 .6 1 1.6 0 2.2l-2.8 1.6-3.4-3.2Z" />
                </svg>
                <span>
                  <b>Google Play</b>Download app
                </span>
              </a>
              <a
                href="https://apps.apple.com/in/app/simbatasker/id6736746247"
                className="app-badge"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <path d="M16.4 12.6c0-2 1.6-3 1.7-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.6 0-1.6-.7-2.6-.7-1.3 0-2.6.8-3.2 2-1.4 2.4-.4 6 1 8 .6 1 1.4 2.1 2.4 2 .9 0 1.3-.6 2.4-.6s1.4.6 2.4.6 1.7-1 2.3-2c.7-1.1 1-2.2 1-2.3-.1 0-1.9-.8-1.9-3Zm-2-5.6c.5-.7.9-1.6.8-2.5-.8 0-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9.1 1.8-.4 2.3-1.1Z" />
                </svg>
                <span>
                  <b>App Store</b>Download app
                </span>
              </a>
            </div>
          </div>
          <div className="foot-col">
            <h5>Explore</h5>
            <LandingSectionLink sectionId="categories">Categories</LandingSectionLink>
            <Link to="/near-by-services">Top providers</Link>
            <LandingSectionLink sectionId="how">How it works</LandingSectionLink>
          </div>
          <div className="foot-col">
            <h5>Company</h5>
            <LandingSectionLink sectionId="about">About us</LandingSectionLink>
            <Link to="/sign-up?role=2">Become a provider</Link>
            <a href="mailto:info@simbatasker.com">Contact</a>
            <a href="mailto:info@simbatasker.com">Help centre</a>
          </div>
          <div className="foot-col">
            <h5>Legal</h5>
            <a
              href="https://simbatasker.com/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy policy
            </a>
            <a
              href="https://simbatasker.com/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms &amp; conditions
            </a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Simba Tasker. Proudly serving Zimbabwe.</span>
          <span>Made with care in Zimbabwe 🇿🇼</span>
        </div>
      </div>
    </footer>
  );
}
