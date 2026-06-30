import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { searchProvidersPath } from "../utils/searchProvidersUrl";
import {
  buildSearchUrlWithoutQuery,
  isProviderSearchPath,
  readSearchFromUrl,
} from "../utils/headerSearchSync";

const Search = ({ variant = "default" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const onSearchPage = isProviderSearchPath(location.pathname);

  const [searchText, setSearchText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!onSearchPage) {
      setSearchText("");
      return;
    }
    setSearchText(readSearchFromUrl(location.search));
  }, [location.pathname, location.search, onSearchPage]);

  const allUserCategories = useSelector(
    (state) => state.UserSlice.allUserCategories
  );

  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      try {
        await dispatch(CustomerActions.getAllCategories());
      } catch (error) {
        console.error("Error fetching category and services:", error);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch]);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  const handleClear = () => {
    setSearchText("");
    if (onSearchPage) {
      navigate(
        buildSearchUrlWithoutQuery(location.pathname, location.search, "search")
      );
    }
  };

  const normalizeCategoryName = (name) => {
    if (!name) return "";
    return name.trim().replace(/\s*,\s*/g, ", ").toLowerCase();
  };

  const uniqueCategories = Array.from(
    new Set(
      allUserCategories?.allCat?.map((item) =>
        normalizeCategoryName(item.service_category_name)
      )
    )
  ).map((name) =>
    allUserCategories?.allCat?.find(
      (item) => normalizeCategoryName(item.service_category_name) === name
    )
  );

  const filterData =
    uniqueCategories?.filter((item) =>
      normalizeCategoryName(item?.service_category_name).includes(
        searchText.toLowerCase()
      )
    ) || [];

  const goToProviderSearch = (overrides = {}) => {
    const q = (overrides.search ?? searchText).trim();
    navigate(
      searchProvidersPath("/customer-search-providers", {
        search: q || undefined,
        categoryIds: overrides.categoryId ? [overrides.categoryId] : undefined,
        page: 1,
      })
    );
  };

  const handleItemClick = (item) => {
    const categoryName = item?.service_category_name || "";
    setSearchText(categoryName);
    goToProviderSearch({ search: categoryName, categoryId: item?._id });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goToProviderSearch();
    }
  };

  const suggestionsList =
    isFocused && filterData.length > 0 && searchText ? (
      <ul className="search-list search-list--dropdown">
        {filterData.map((ele) => (
          <li key={ele._id} onMouseDown={() => handleItemClick(ele)}>
            {ele?.service_category_name}
          </li>
        ))}
      </ul>
    ) : null;

  const clearButton =
    searchText ? (
      <button
        type="button"
        className="header-search-clear"
        aria-label="Clear search"
        onClick={handleClear}
      >
        ×
      </button>
    ) : null;

  if (variant === "appnav") {
    return (
      <div className="appnav-search-wrap">
        <input
          type="search"
          placeholder="Search service or provider"
          value={searchText}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        />
        {clearButton}
        {suggestionsList}
      </div>
    );
  }

  return (
    <div className="user-pro-search" style={{ position: "relative" }}>
      <input
        type="search"
        placeholder="Search Service Category"
        className="me-2 form-control"
        value={searchText}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />
      {clearButton}
      <img
        className="search-icn"
        src={require("../Assets/Images/search-icon.svg").default}
        alt=""
      />
      {suggestionsList}
    </div>
  );
};

export default Search;
