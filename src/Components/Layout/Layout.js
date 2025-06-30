import React, { useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
const Layout = ({ children }) => {
  return (
    <div>
      <div className="main-wrap">
        <Header />
        {children}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
