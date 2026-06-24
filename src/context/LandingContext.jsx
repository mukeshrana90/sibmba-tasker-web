import React, { createContext, useCallback, useContext, useState } from "react";

const LandingContext = createContext(null);

export function LandingProvider({ children }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [nearbyEnabled, setNearbyEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationText, setLocationText] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);

  const selectCategory = useCallback((categoryId) => {
    setSelectedCategoryId(categoryId || null);
    const el = document.getElementById("providers");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <LandingContext.Provider
      value={{
        selectedCategoryId,
        setSelectedCategoryId,
        selectCategory,
        nearbyEnabled,
        setNearbyEnabled,
        searchQuery,
        setSearchQuery,
        locationText,
        setLocationText,
        locationCoords,
        setLocationCoords,
      }}
    >
      {children}
    </LandingContext.Provider>
  );
}

export function useLanding() {
  const ctx = useContext(LandingContext);
  if (!ctx) {
    return {
      selectedCategoryId: null,
      setSelectedCategoryId: () => {},
      selectCategory: () => {},
      nearbyEnabled: false,
      setNearbyEnabled: () => {},
      searchQuery: "",
      setSearchQuery: () => {},
      locationText: "",
      setLocationText: () => {},
      locationCoords: null,
      setLocationCoords: () => {},
    };
  }
  return ctx;
}
