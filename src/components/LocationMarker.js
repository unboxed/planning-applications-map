// LocationMarker.js
import React, { useState, useEffect, useCallback } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import { Button } from 'govuk-react';
import { DivIcon } from 'leaflet';

const createCustomIcon = (className) => new DivIcon({
  className: '',
  html: `<div class="${className}"></div>`,
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

function LocationMarker() {
  const [position, setPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const map = useMap();

  const onLocationFound = useCallback((e) => {
    setPosition(e.latlng);
    map.flyTo(e.latlng, 16);
  }, [map]);

  const toggleTracking = useCallback(() => {
    if (tracking) {
      setTracking(false);
      map.off('locationfound', onLocationFound);
      setPosition(null);
    } else {
      setTracking(true);
      map.on('locationfound', onLocationFound);
      map.locate();
    }
  }, [tracking, map, onLocationFound]);

  useEffect(() => {
    return () => {
      map.off('locationfound', onLocationFound);
    };
  }, [map, onLocationFound]);

  return (
    <>
      <Button onClick={toggleTracking} style={{ position: 'absolute', bottom: '-4%', left: "1%", zIndex: 4000, width: '185px' }}>
        {tracking ? 'Hide My Location' : 'Show My Location'}
      </Button>
      {position && (
        <Marker icon={createCustomIcon('my-location')} position={position}>
          <Popup>You are here</Popup>
        </Marker>
      )}
    </>
  );
}

export default LocationMarker;
