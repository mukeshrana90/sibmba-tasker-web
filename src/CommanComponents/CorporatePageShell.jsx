import Layout from "../Components/Layout/Layout";
import SimbaPageBanner from "./SimbaPageBanner";
import { getAppHomePath } from "../utils/appHomePath";

export default function CorporatePageShell({
  title,
  crumbLabel,
  homeTo,
  pageClass = "p-corporate-portal p-corporate",
  showBanner = true,
  children,
}) {
  return (
    <Layout footerVariant="marketing">
      <div className={`simba-page ${pageClass}`}>
        {showBanner && title ? (
          <SimbaPageBanner
            title={title}
            crumbLabel={crumbLabel}
            homeTo={homeTo ?? getAppHomePath()}
          />
        ) : null}
        <main className="page">
          <div className="wrap corp-portal-content">
            {!showBanner && title ? <h1>{title}</h1> : null}
            {children}
          </div>
        </main>
      </div>
    </Layout>
  );
}
