import React from "react";
import Layout from "../Components/Layout/Layout";
import HomeLanding from "../CommanComponents/Landing/HomeLanding";

export default function Home() {
  return (
    <Layout footerVariant="marketing">
      <HomeLanding />
    </Layout>
  );
}
