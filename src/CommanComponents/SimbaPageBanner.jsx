import { Link } from "react-router-dom";

export default function SimbaPageBanner({
  title,
  crumbLabel,
  homeTo = "/",
  midCrumb,
}) {
  return (
    <section className="corp-banner">
      <h1>{title}</h1>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="crumbs-path">
          <Link to={homeTo}>Home</Link>
          <span className="crumbs-sep" aria-hidden="true">
            /
          </span>
          {midCrumb?.to && midCrumb?.label ? (
            <>
              <Link to={midCrumb.to}>{midCrumb.label}</Link>
              <span className="crumbs-sep" aria-hidden="true">
                /
              </span>
            </>
          ) : null}
        </span>
        <span className="here">{crumbLabel}</span>
      </nav>
    </section>
  );
}
