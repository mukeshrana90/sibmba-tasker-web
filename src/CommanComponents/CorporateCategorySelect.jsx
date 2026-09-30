import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { buildSelectStyles } from "./CountrySelect";

// ~6 rows visible on desktop, ~5 on phones; the rest scroll inside the menu
const MENU_MAX_DESKTOP = 264;
const MENU_MAX_PHONE = 220;
const PHONE_QUERY = "(max-width: 576px)";

function usePhone() {
  const get = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(PHONE_QUERY).matches
      : false;
  const [phone, setPhone] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return phone;
}

/**
 * Compact, searchable corporate category picker (replaces the native <select>,
 * whose option list grows with every new category and can't be sized by CSS).
 * `categories` = [{ _id, name }], `value` = selected _id, `onChange(id)`.
 */
export default function CorporateCategorySelect({
  categories = [],
  value,
  onChange,
  onBlur,
  name = "corporateCategoryId",
  inputId,
  placeholder = "Select",
  isDisabled = false,
  variant = "default",
  invalid = false,
}) {
  const phone = usePhone();
  const options = useMemo(
    () =>
      (categories || [])
        .filter((c) => c?._id)
        .map((c) => ({ value: String(c._id), label: c.name || "" })),
    [categories]
  );
  const selected = useMemo(
    () => options.find((o) => o.value === String(value || "")) || null,
    [options, value]
  );
  const styles = useMemo(() => {
    const base = buildSelectStyles(variant);
    return {
      ...base,
      control: (b, s) => ({
        ...base.control(b, s),
        ...(invalid && !s.isFocused ? { borderColor: "#dc3545" } : null),
      }),
      menu: (b, s) => ({ ...base.menu(b, s), zIndex: 1060 }),
      menuPortal: (b) => ({ ...b, zIndex: 1060 }),
      menuList: (b, s) => ({
        ...base.menuList(b, s),
        maxHeight: phone ? MENU_MAX_PHONE : MENU_MAX_DESKTOP,
        overscrollBehavior: "contain",
      }),
      option: (b, s) => ({
        ...base.option(b, s),
        padding: phone ? "10px 12px" : "8px 12px",
        lineHeight: 1.35,
        whiteSpace: "normal",
      }),
      singleValue: (b, s) => ({
        ...base.singleValue(b, s),
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }),
    };
  }, [variant, phone, invalid]);

  return (
    <Select
      name={name}
      inputId={inputId}
      classNamePrefix="corp-cat-select"
      options={options}
      value={selected}
      onChange={(opt) => onChange?.(opt?.value || "")}
      onBlur={onBlur}
      placeholder={placeholder}
      isSearchable
      isClearable={false}
      isDisabled={isDisabled}
      menuPlacement="auto"
      menuShouldScrollIntoView
      maxMenuHeight={phone ? MENU_MAX_PHONE : MENU_MAX_DESKTOP}
      styles={styles}
      aria-invalid={invalid || undefined}
      noOptionsMessage={() => "No category found"}
    />
  );
}
