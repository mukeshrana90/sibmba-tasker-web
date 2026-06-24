import React, { useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import CustomerActions from "../Redux/Actions/CustomerActions";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "../utils/CommonFunction";
import { searchProvidersPath } from "../utils/searchProvidersUrl";

const Search = ({ variant = "default" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const getQueryURL = useQuery();

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Fetch initial search value from URL and update when URL changes
  useEffect(() => {
    const searchValFromUrl = getQueryURL.get("search") || "";
    setSearchText(decodeURIComponent(searchValFromUrl));
  }, [location.search]);

  const allUserCategories = useSelector(
    (state) => state.UserSlice.allUserCategories
  );

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategoryAndServices = async () => {
      setLoading(true);
      try {
        await dispatch(CustomerActions.getAllCategories());
      } catch (error) {
        console.error("Error fetching category and services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndServices();
  }, [dispatch]);

  const handleSearchChange = (e) => {
    setSearchText(e.target.value);
  };

  // Normalize category name: trim spaces, lowercase, standardize comma spacing
  const normalizeCategoryName = (name) => {
    if (!name) return "";
    return name
      .trim() // Remove leading/trailing spaces
      .replace(/\s*,\s*/g, ", ") // Standardize comma spacing (e.g., "a , b" -> "a, b")
      .toLowerCase(); // Convert to lowercase
  };

  // Normalize categories and filter
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

  // Handle click on a search result
  const goToProviderSearch = (overrides = {}) => {
    const q = overrides.search ?? searchText;
    navigate(
      searchProvidersPath("/customer-search-providers", {
        search: q,
        categoryIds: overrides.categoryId ? [overrides.categoryId] : undefined,
      })
    );
  };

  const handleItemClick = (item) => {
    const categoryName = item?.service_category_name || "";
    setSearchText(categoryName);
    goToProviderSearch({ search: categoryName, categoryId: item?._id });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchText.trim()) {
      e.preventDefault();
      goToProviderSearch();
    }
  };

  const suggestionsList =
    isFocused && filterData.length > 0 && searchText ? (
      <ul className="search-list search-list--dropdown">
        {filterData.map((ele, index) => (
          <li key={index} onMouseDown={() => handleItemClick(ele)}>
            {ele?.service_category_name}
          </li>
        ))}
      </ul>
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
        {suggestionsList}
      </div>
    );
  }

  return (
    <div className="user-pro-search" style={{ position: "relative" }}>
      <Form.Control
        type="search"
        placeholder="Search Service Category"
        className="me-2"
        value={searchText}
        onChange={handleSearchChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
      />
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