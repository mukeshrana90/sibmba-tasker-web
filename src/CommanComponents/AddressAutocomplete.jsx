// import React from "react";
// import GoogleAutocomplete from "react-google-autocomplete";

// const AddressAutocomplete = ({ apiKey, onPlaceSelected, defaultValue, options = {}, className = "form-control" }) => {


//     return (
//         <GoogleAutocomplete
//             apiKey={apiKey}
//             onPlaceSelected={onPlaceSelected}
//             options={options}
//             defaultValue={defaultValue}
//             className={className}
//         />
//     );
// };

// export default AddressAutocomplete;


import React, { useRef, useEffect } from "react";
import GoogleAutocomplete from "react-google-autocomplete";

const AddressAutocomplete = ({
    apiKey,
    onPlaceSelected,
    defaultValue,
    onChange,
    options = {},
    className = "form-control",
}) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.value = defaultValue || "";
        }
    }, [defaultValue]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <GoogleAutocomplete
            apiKey={apiKey}
            onPlaceSelected={(place) => {
                onPlaceSelected(place);
                if (inputRef.current) {
                    inputRef.current.value = place.formatted_address || "";
                    onChange({
                        target: {
                            value: place.formatted_address || "",
                        },
                    });
                }
            }}
            options={options}
            defaultValue={defaultValue}
            className={className}
            inputAutocompleteValue="off"
            onChange={handleInputChange}
            ref={inputRef}
        />
    );
};

export default AddressAutocomplete;