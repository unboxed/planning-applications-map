import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button, SearchBox } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import { DivIcon } from 'leaflet';
// import data from './london-spots.json';
let pageSize = 50;

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

// 24-00635-PA14J 23-00464-HAPP 23-00453-LDCP

function App () {

  const mapRef = useRef(null);
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);

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

      // console.log(applicationData);

      setGeojson(toGeoJSON(applicationData));
      setLoading(false);

      // console.log(toGeoJSON(applicationData));
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

  const Search = () => {

    const map = useMap();
    if (!map) {return}
  
    let result = {
      "name":"NewFeatureType",
      "type":"FeatureCollection",
      "features":[]
    };
  
    const searchInput = document.getElementById('searchInput');

    function search() {
      for (const entry of geojson.features) {
        if (entry.properties.reference === searchInput.value) {
          console.log('found!');
          result.features.push(entry);
          map.flyTo(entry.geometry.coordinates, map.getZoom());
        }
      }
    }

    return (
    <div>
      <SearchBox>
        <SearchBox.Input id="searchInput" placeholder="Search for a reference number" />
        <SearchBox.Button onClick={search}/>
      </SearchBox>
    </div>);
  };

  console.log(geojson);

  if (loading) {return (<div>Loading...</div>);}

  return (
    <div>
      <div style={{ height: 'calc(100% - 30px)', position: 'relative' }}>
        <MapContainer whenCreated={(map) => {mapRef.current = map}} center={[51.505, -0.09]} zoom={13}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <GeoJSON data={geojson} onEachFeature={onEachFeature} />
          <LocationMarker />
          <br /> 
          <Search />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;