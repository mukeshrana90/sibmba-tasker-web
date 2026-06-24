import { Link } from "react-router-dom";

export default function SimbaPageBanner({
  title,
  crumbLabel,
  homeTo = "/",
}) {
  return (
    <section className="corp-banner">
      <h1>{title}</h1>
      <div className="crumbs">
        <Link to={homeTo}>Home</Link>
        <span>/</span>
        <span className="here">{crumbLabel}</span>
      </div>
    </section>
  );
}
