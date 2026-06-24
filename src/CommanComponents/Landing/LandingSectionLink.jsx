import { useLocation, useNavigate } from "react-router-dom";
import { navigateToLandingSection } from "../../utils/landingNav";

export default function LandingSectionLink({ sectionId, children, className }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <a
      href={`/#${sectionId}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigateToLandingSection(sectionId, navigate, pathname);
      }}
    >
      {children}
    </a>
  );
}
