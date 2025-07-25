import React, { useState, useRef, useEffect } from "react";

const options = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Rejected", value: "rejected" },
];

const CustomSelect = ({ selected, setSelected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleOptionClick = (value) => {
    setSelected(value);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = options.find((o) => o.value === selected)?.label || "Select";

  return (
    <div className="custom-select-wrapper" ref={dropdownRef}>
      <div
        className="custom-select-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {currentLabel}
        <span className="arrow">&#9662;</span>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-select-option ${
                selected === option.value ? "active" : ""
              }`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
