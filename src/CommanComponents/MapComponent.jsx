// MapComponent.jsx
import React from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";

const render = (status) => {
  if (status === Status.LOADING) return <div>Loading map...</div>;
  if (status === Status.FAILURE) return <div>Error loading map</div>;
  return null;
};


const GoogleMap = ({ coordinates, address }) => {
  const mapRef = React.useRef(null);
  const [map, setMap] = React.useState(null);

  React.useEffect(() => {
    if (mapRef.current && !map && coordinates && coordinates.length === 2) {
      const position = { lat: coordinates[1], lng: coordinates[0] }; 

      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 13,
      });

      new window.google.maps.Marker({
        position: position,
        map: googleMap,
        title: address,
      });

      setMap(googleMap);
    }
  }, [mapRef, map, coordinates, address]);

  if (!coordinates || coordinates.length < 2) {
    return <div>No location data available</div>;
  }

  return <div ref={mapRef} style={{ height: "400px", width: "100%" }} />;
};
    
const MapComponent = ({ coordinates, address }) => {
  return (
    <Wrapper apiKey={"AIzaSyBRZp7G4TbTK0Fx4uo_8nJfwefH9WtU5zc"} render={render}>
      <GoogleMap coordinates={coordinates} address={address} />
    </Wrapper>
  );
};

export default MapComponent;