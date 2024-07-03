import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import { DivIcon } from 'leaflet';
import { parse } from 'nth-check';
// import data from './london-spots.json';
var applicationData = {};
let parsed = false;


// Current location finder
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
    map.flyTo(e.latlng, map.getZoom());
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
  
  
  //cleanup
  useEffect(() => {
    return () => {
      map.off('locationfound', onLocationFound);
    };
  }, [map, onLocationFound]);
  
  return (
    <>
      <Button onClick={toggleTracking} style={{ position: 'absolute', top:'93.5%', zIndex: 4000, width:'180px' }}>
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

// API fetch
axios.defaults.baseURL = 'https://cors-anywhere.herokuapp.com/https://southwark.bops-staging.services';

async function fetchData() {
  const response = await axios.get('/api/v2/public/planning_applications/search', {headers: { 'Access-Control-Allow-Origin': '*' }})
  .then((response) => response)
  .catch((e) => {console.log(e);});
  return response; 
}

applicationData = parseJSON(await fetchData());
console.log(applicationData);


var data = {
  "name":"NewFeatureType",
  "type":"FeatureCollection",
  "features":[{
    "type":"Feature",
    "geometry":{
      "type":"Marker",
      "coordinates":[]
    },
    "properties":null
  }]
};

// Parsing data acquired from GET request
function parseJSON (data) {
  var result = {};
  for (let i = 0; i < 10; i++) {
    var currentApplication = data.data.data[i.toString()];
    result[i.toString()] = {
      "title" : currentApplication["property"]["address"]["singleLine"],
      "latitude" : currentApplication["property"]["address"]["latitude"],
      "longitude" : currentApplication["property"]["address"]["longitude"],
      "status" : currentApplication["application"]["status"],
      "description" : currentApplication["proposal"]["description"]
    }
  }
  return result;
}

// data.features[0].geometry.coordinates.push([applicationData["0"]["latitude"], applicationData["0"]["longitude"]]);
// console.log(data);


function App () {
  
  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.description) {
      layer.bindPopup(`<h3>${feature.properties.name}</h3><p>${feature.properties.description}</p>`);
    }
    if (feature.properties) {
      layer.bindPopup(`<h3>${feature.properties.Name}</h3>`);
    }
  };

  return (
    <div>
      <div style={{ height: 'calc(100% - 30px)', position: 'relative' }}>
        <MapContainer center={[51.505, -0.09]} zoom={13}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* <GeoJSON data={data} onEachFeature={onEachFeature} /> */}
          <LocationMarker />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;