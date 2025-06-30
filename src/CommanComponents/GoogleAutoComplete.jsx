import React from "react";
import GooglePlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from "react-google-places-autocomplete";

const GoogleAutoComplete = ({ intialState, setIntialState }) => {
  console.log("GoogleAutoComplete intialState", intialState);

  const handleSelect = async (place) => {
    try {
      if (!place) {
        setIntialState(null);
        return;
      }

      const { description, place_id } = place.value;
      const results = await geocodeByAddress(description);
      const { lat, lng } = await getLatLng(results[0]);
      setIntialState({
        label: place.label,
        lat: lat,
        lng: lng,
        value: {
          description: description,
          place_id: place_id,
        },
      });
    } catch (error) {
      console.error("Error fetching address details:", error);
    }
  };

  return (
    <>
      <GooglePlacesAutocomplete
        apiKey={"AIzaSyBY7WePV2Eg7cigEfbsFvjs1GzEHx6GXVA"}
        selectProps={{
          value: intialState,
          onChange: handleSelect,
          placeholder: "Search for a location...",
          isClearable: intialState?.label ? true : false,
        }}
      />
    </>
  );
};

export default GoogleAutoComplete;
