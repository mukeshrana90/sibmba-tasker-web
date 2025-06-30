import React, { useState, useEffect } from "react";
import Select from "react-select";
import useDebouncedValue from "../Hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useQuery } from "../utils/CommonFunction";
import { useDispatch, useSelector } from "react-redux";
import CustomerActions from "../Redux/Actions/CustomerActions";

const SearchCategory = ({ onSearch }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const getQueryURL = useQuery();
  const searchValFromUrl = getQueryURL.get("search");
  const [searchValue, setSearchValue] = useState(searchValFromUrl || "");
  const debouncedSearchValue = useDebouncedValue(searchValue, 300);

  const allUserCategories = useSelector(
    (state) => state.UserSlice.allUserCategories
  );

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

  const formattedOptions =
    allUserCategories?.allCat?.map((item) => ({
      value: item._id,
      label: item.service_category_name,
    })) || [];

  const handleInputChange = (val) => {
    setSearchValue(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchValue.trim()) {
      e.preventDefault();
      navigate(`/search-for-service?search=${encodeURIComponent(searchValue.trim())}`);
      if (onSearch) onSearch(searchValue.trim());
      setSearchValue("");
    }
  };

  const customStyles = {
    container: (provided) => ({
      ...provided,
      width: "300px",
    }),
    control: (provided) => ({
      ...provided,
      minHeight: "2px",
      borderRadius: "4px",
      borderColor: "#fff",
      boxShadow: "none",
      "&:hover": { borderColor: "#fff" },
    }),
    indicatorsContainer: () => ({ display: "none" }),
    dropdownIndicator: () => null,
    clearIndicator: () => null,
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
  };

  return (
    <div className="top-search-bar">
      <Select
        inputValue={searchValue}
        onInputChange={handleInputChange}
        options={formattedOptions}
        onKeyDown={handleKeyDown}
        placeholder="Search here"
        styles={customStyles}
        components={{ DropdownIndicator: null, IndicatorSeparator: null }}
        menuPlacement="auto"
        menuIsOpen={searchValue?.length >= 3}
        noOptionsMessage={() => "No suggestions"}
        onChange={(selected) => {
          if (selected) {
            navigate(`/search-for-service?search=${encodeURIComponent(selected.value)}`);
            if (onSearch) onSearch(selected.value);
            setSearchValue("");
          }
        }}
        isSearchable
        blurInputOnSelect
      />
    </div>
  );
};

export default SearchCategory;
