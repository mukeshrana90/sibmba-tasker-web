import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../Assets/css/landing.css";

function MenuIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1E1A15"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

const NAV_ANCHORS = [
  { label: "Categories", href: "/#categories" },
  { label: "Providers", href: "/#providers" },
  { label: "How it works", href: "/#how" },
  { label: "Why us", href: "/#about" },
];

export default function LandingGuestHeader() {
  const navigate = useNavigate();
  const [joinOpen, setJoinOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const joinRef = useRef(null);
  const mobileOpenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const suppressScrollCloseRef = useRef(0);

  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
    if (mobileOpen) {
      suppressScrollCloseRef.current = Date.now() + 450;
    }
  }, [mobileOpen]);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      document.getElementById("landingNav")?.classList.toggle("scrolled", y > 8);
      setJoinOpen(false);

      if (!mobileOpenRef.current) {
        lastScrollYRef.current = y;
        return;
      }

      if (Date.now() < suppressScrollCloseRef.current) {
        lastScrollYRef.current = y;
        return;
      }

      if (Math.abs(y - lastScrollYRef.current) > 10) {
        setMobileOpen(false);
      }
      lastScrollYRef.current = y;
    };

    const onClose = () => setJoinOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("landing:closeJoin", onClose);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("landing:closeJoin", onClose);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (joinRef.current && !joinRef.current.contains(e.target)) {
        setJoinOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header
      className={`landing-nav${joinOpen ? " landing-nav--join-open" : ""}${
        mobileOpen ? " landing-nav--mobile-open" : ""
      }`}
      id="landingNav"
    >
      <div className="landing-wrap landing-nav__inner">
        <Link to="/" className="landing-nav__logo">
          <img src={require("../../Assets/Images/dark-logo.png")} alt="Simba Tasker" />
        </Link>

        <nav className="landing-nav__links">
          <a href="/#categories">Categories</a>
          <a href="/#providers">Providers</a>
          <a href="/#how">How it works</a>
          <a href="/#about">Why us</a>
        </nav>

        <div className="landing-nav__cta">
          <Link to="/post-task" className="landing-nav__post-task">
            Post a Task
          </Link>
          <button
            type="button"
            className="landing-btn landing-btn--ghost landing-nav__signin"
            onClick={() => navigate("/login")}
          >
            Sign in
          </button>

          <div
            className={`landing-join-wrap${joinOpen ? " is-open" : ""}`}
            ref={joinRef}
          >
            <button
              type="button"
              className="landing-btn landing-btn--primary landing-join-btn"
              aria-haspopup="true"
              aria-expanded={joinOpen}
              onClick={(e) => {
                e.stopPropagation();
                setJoinOpen((v) => !v);
              }}
            >
              Join As
              <svg
                className="landing-join-chev"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div className="landing-join-menu" role="menu">
              <button
                type="button"
                className="landing-join-opt"
                onClick={() => navigate("/sign-up?role=2")}
              >
                <span className="landing-join-ico landing-join-ico--blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6M22 11h-6" />
                  </svg>
                </span>
                <span className="landing-join-txt">
                  <b>Join as Service Provider</b>
                  <small>Offer your services and grow your business</small>
                </span>
              </button>
              <button
                type="button"
                className="landing-join-opt"
                onClick={() => navigate("/sign-up?role=3")}
              >
                <span className="landing-join-ico landing-join-ico--purple">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v18M15 9h4a1 1 0 0 1 1 1v12M4 22h17M8 7h2M8 11h2M8 15h2" />
                  </svg>
                </span>
                <span className="landing-join-txt">
                  <b>Join as Corporate</b>
                  <small>Enterprise solutions for your organization</small>
                </span>
              </button>
              <div className="landing-join-divider" />
              <button
                type="button"
                className="landing-join-opt"
                onClick={() => navigate("/sign-up")}
              >
                <span className="landing-join-ico landing-join-ico--green">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8.5 12 2.5 2.5 4.5-5" />
                  </svg>
                </span>
                <span className="landing-join-txt">
                  <b>I Need a Service</b>
                  <small>Find and hire trusted professionals instantly</small>
                </span>
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="landing-nav__menu-btn"
          aria-label="Menu"
          aria-expanded={mobileOpen}
          onClick={(e) => {
            e.stopPropagation();
            const next = !mobileOpenRef.current;
            if (next) {
              suppressScrollCloseRef.current = Date.now() + 500;
            }
            mobileOpenRef.current = next;
            setMobileOpen(next);
            setJoinOpen(false);
          }}
        >
          <MenuIcon />
        </button>
      </div>

      {mobileOpen && (
        <div className="landing-nav-mobile">
          <nav className="landing-nav-mobile__links">
            {NAV_ANCHORS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="landing-nav-mobile__actions">
            <Link
              to="/post-task"
              className="landing-nav__post-task landing-nav-mobile__post-task"
              onClick={() => setMobileOpen(false)}
            >
              Post a Task
            </Link>
            <button
              type="button"
              className="landing-btn landing-btn--ghost landing-nav__signin"
              onClick={() => {
                setMobileOpen(false);
                navigate("/login");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              onClick={() => {
                setMobileOpen(false);
                navigate("/sign-up?role=2");
              }}
            >
              Join as Service Provider
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              onClick={() => {
                setMobileOpen(false);
                navigate("/sign-up?role=3");
              }}
            >
              Join as Corporate
            </button>
            <button
              type="button"
              className="landing-btn landing-btn--primary"
              onClick={() => {
                setMobileOpen(false);
                navigate("/sign-up");
              }}
            >
              I Need a Service
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
