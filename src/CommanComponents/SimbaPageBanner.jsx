import { Link } from "react-router-dom";

export default function SimbaPageBanner({
  title,
  crumbLabel,
  homeTo = "/",
  midCrumb,
  variant,
}) {
  const bannerClass =
    variant === "logistics" ? "corp-banner corp-banner--logistics" : "corp-banner";

  return (
    <section className={bannerClass}>
      {variant === "logistics" ? (
        <>
          <span className="corp-banner__deco corp-banner__deco--leaves" aria-hidden="true" />
          <span className="corp-banner__deco corp-banner__deco--truck" aria-hidden="true" />
        </>
      ) : null}
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
