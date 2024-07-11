import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button, SearchBox, ErrorText } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import { DivIcon } from 'leaflet';
// import data from './london-spots.json';
let pageSize = 50;
let zoomSize = 16;

const createCustomIcon = (className) => new DivIcon({
  className: '',
  html: `<div class="${className}"></div>`,
  iconSize: [25, 25],
  iconAnchor: [12, 25],
  popupAnchor: [0, -25],
});

// Current location finder
function LocationMarker() {
  const [position, setPosition] = useState(null);
  const [tracking, setTracking] = useState(false);
  const map = useMap();
  
  const onLocationFound = useCallback((e) => {
    setPosition(e.latlng);
    map.flyTo(e.latlng, zoomSize);
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
      <Button onClick={toggleTracking} style={{ position: 'absolute', top:'93.5%', zIndex: 4000, width:'185px' }}>
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

const fetchData = async(link) => {
  try {
    const response = await axios.get(link, {
      params: { maxresults: pageSize,
       }
    });
    return response.data;
  } catch (e) {
    console.log(e);
  }
}

const fetchPostCode = async(postcode) => {
  try {
    const response = await axios.get('https://api.postcodes.io/postcodes/' + postcode);
    if (response.data.status === 200) {
      return [response.data.result.longitude, response.data.result.latitude];
    }
  } catch (e) {
    console.log(e);
    return 'failed!'
  }
}


// Parsing data acquired from GET request
function parseJSON (data, iter, applicationData) {
  for (let i = 0; i < Object.keys(data.data).length; i++) {
    var currentApplication = data.data[i.toString()];
    applicationData[(i + iter * pageSize).toString()] = {
      "title" : currentApplication["property"]["address"]["singleLine"],
      "latitude" : currentApplication["property"]["address"]["latitude"],
      "longitude" : currentApplication["property"]["address"]["longitude"],
      "status" : currentApplication["application"]["status"],
      "reference" : currentApplication["application"]["reference"],
      "description" : currentApplication["proposal"]["description"],
    }
  }
}

// Make data GeoJSON format
function toGeoJSON(data) {
  var result = {
    "name":"NewFeatureType",
    "type":"FeatureCollection",
    "features":[]
  };
  
  for (let i=0; i < Object.keys(data).length; i++) {
    let iter = i.toString();
    result.features.push({
      "type":"Feature",
      "geometry":{
        "type":"Point",
        "coordinates":[data[iter]["longitude"], data[iter]["latitude"]]
      },
      "properties":{
        "name" : data[iter]["title"],
        "description" : data[iter]["description"],
        "status" : data[iter]["status"],
        "reference" : data[iter]["reference"]
      },
    });
  }
  
  return result;
}



function App () {

  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);

  var input = document.getElementById("searchInput");
  input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      document.getElementById("searchBtn").click();
    }
  });

  useEffect(() => {
    let applicationData = {};

    const loadData = async() => {
      // parse first page's data
      let currentPageData = await fetchData('https://southwark.bops-staging.services/api/v2/public/planning_applications/search');
      parseJSON(currentPageData, 0, applicationData);
      let i = 1;

      // iterate through all other pages and parse data
      while (currentPageData.links.next != null) {
        currentPageData = await fetchData(currentPageData.links.next);
        parseJSON(currentPageData, i, applicationData);
        i++;
      }

      setGeojson(toGeoJSON(applicationData));
      setLoading(false);
    }

    loadData();
  }, []);


  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.description && feature.properties.status) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>
        <p class="govuk-body" style="font-size: 14px">Reference: ${feature.properties.reference}</p>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>
        <p class="govuk-body" style="font-size: 14px">Current status: ${feature.properties.status}</p>`);
    }
    else if (feature.properties && feature.properties.description) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>`);
    }
    else if (feature.properties) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>`);
    }
  };

  const search = async() => {
    if (!map) {return}
    
    document.getElementById("errorMsg").innerHTML = "";
    const searchInput = document.getElementById('searchInput').value;
    
    // check if input is reference number and focus on it if found
    for (const entry of geojson.features) {
      if (entry.properties.reference === searchInput) {
        map.flyTo([entry.geometry.coordinates[1], entry.geometry.coordinates[0]], 18);
      }
    }

    // check if input is postcode then focus on it if valid
    const postcodeRegex = /^[A-Z]{1,2}[0-9RCHNQ][0-9A-Z]?\s?[0-9][ABD-HJLNP-UW-Z]{2}$|^[A-Z]{2}-?[0-9]{4}$/;
    if (postcodeRegex.test(searchInput.toUpperCase())){
      let postcodeCoords = await fetchPostCode(searchInput);
      if (postcodeCoords !== 'failed!') {
        map.flyTo([postcodeCoords[1], postcodeCoords[0]], zoomSize);
      }
      else {document.getElementById("errorMsg").innerHTML = "Please enter a valid postcode";}
    }
  };

  if (loading) {return (<div>Loading...</div>);}

  return (
    <div>
      <SearchBox style={{zIndex:4000}}>
        <SearchBox.Input id="searchInput" placeholder="Enter a reference number or postcode" style={{zIndex:4000}} />
        <SearchBox.Button id="searchBtn" onClick={search} style={{zIndex:4000}} />
      </SearchBox>
      <ErrorText id="errorMsg"></ErrorText>
      <div style={{ height: 'calc(100% - 30px)', position: 'relative' }}>
        <MapContainer ref={setMap} center={[51.505, -0.09]} zoom={13}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON data={geojson} onEachFeature={onEachFeature} />
          <LocationMarker />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
