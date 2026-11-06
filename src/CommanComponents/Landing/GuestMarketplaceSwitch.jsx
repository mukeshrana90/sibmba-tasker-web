import { useNavigate } from "react-router-dom";
import { setActiveModule } from "../../utils/Roles";
import { setLastSection } from "../../utils/lastSection";
import "../../Assets/css/landing.css";

const Svg = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const OPTIONS = [
  {
    module: "tasker",
    to: "/",
    title: "Services",
    sub: "Find skilled professionals",
    testId: "market-services",
    icon: (
      <Svg>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
      </Svg>
    ),
  },
  {
    module: "logistics",
    to: "/logistics",
    title: "Logistics",
    sub: "Find trucks & equipment",
    testId: "market-logistics",
    icon: (
      <Svg>
        <path d="M3 7h12v9H3zM15 10h4l2 3v3h-6z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </Svg>
    ),
  },
];

/** Visitor hero: choose the Services or Logistics marketplace. */
export default function GuestMarketplaceSwitch({ active }) {
  const navigate = useNavigate();

  const pick = (option) => {
    if (option.module === active) return;
    // Same bookkeeping as the header switch, so "/" doesn't bounce back to the last section
    setLastSection(option.module);
    setActiveModule(option.module);
    navigate(option.to);
  };

  return (
    <div className="landing-market" data-testid="market-switch">
      <h2 className="landing-market__title">What do you need today?</h2>
      <p className="landing-market__lead">Choose the marketplace that fits your needs</p>
      <div className="landing-market__options">
        {OPTIONS.map((option) => {
          const isActive = option.module === active;
          return (
            <button
              type="button"
              key={option.module}
              className={`landing-market__option${isActive ? " is-active" : ""}`}
              aria-pressed={isActive}
              data-testid={option.testId}
              onClick={() => pick(option)}
            >
              <span className="landing-market__icon">{option.icon}</span>
              <span className="landing-market__text">
                <b>{option.title}</b>
                <small>{option.sub}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
