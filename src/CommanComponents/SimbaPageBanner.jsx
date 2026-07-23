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
      <div className="crumbs">
        <Link to={homeTo}>Home</Link>
        <span>/</span>
        {midCrumb?.to && midCrumb?.label ? (
          <>
            <Link to={midCrumb.to}>{midCrumb.label}</Link>
            <span>/</span>
          </>
        ) : null}
        <span className="here">{crumbLabel}</span>
      </div>
    </section>
  );
}
