// MapComponent.jsx
import React from "react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";

const render = (status) => {
  if (status === Status.LOADING) return <div>Loading map...</div>;
  if (status === Status.FAILURE) return <div>Error loading map</div>;
  return null;
};


const GoogleMap = ({ coordinates, address, onMapClick }) => {
  const mapRef = React.useRef(null);
  const [map, setMap] = React.useState(null);
  const [marker, setMarker] = React.useState(null);

  React.useEffect(() => {
    if (mapRef.current && !map && coordinates && coordinates.length === 2) {
      const position = { lat: coordinates[1], lng: coordinates[0] }; 

      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 13,
      });

      const newMarker = new window.google.maps.Marker({
        position: position,
        map: googleMap,
        title: address,
        draggable: false,
      });

      setMap(googleMap);
      setMarker(newMarker);
    }
  }, [mapRef, map, coordinates, address]);

  // Add click listener to map
  React.useEffect(() => {
    if (map && onMapClick) {
      const clickListener = map.addListener('click', (event) => {
        const clickedPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        
        // Update marker position
        if (marker) {
          marker.setPosition(clickedPosition);
        }
        
        // Call the callback with clicked coordinates
        onMapClick(clickedPosition);
      });

      return () => {
        if (clickListener) {
          window.google.maps.event.removeListener(clickListener);
        }
      };
    }
  }, [map, onMapClick, marker]);

  // Update marker position when coordinates change
  React.useEffect(() => {
    if (marker && coordinates && coordinates.length === 2) {
      const position = { lat: coordinates[1], lng: coordinates[0] };
      marker.setPosition(position);
      if (map) {
        map.setCenter(position);
      }
    }
  }, [marker, coordinates, map]);

  if (!coordinates || coordinates.length < 2) {
    return <div>No location data available</div>;
  }

  return <div ref={mapRef} style={{ height: "400px", width: "100%", cursor: "crosshair" }} />;
};
    
const MapComponent = ({ coordinates, address, onMapClick }) => {
  return (
    <Wrapper apiKey={"AIzaSyBRZp7G4TbTK0Fx4uo_8nJfwefH9WtU5zc"} render={render}>
      <GoogleMap coordinates={coordinates} address={address} onMapClick={onMapClick} />
    </Wrapper>
  );
};

export default MapComponent;