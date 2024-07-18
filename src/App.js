import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button, SearchBox, ErrorText, HintText,Select,Paragraph } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import { DivIcon } from 'leaflet';
import { getValue } from '@testing-library/user-event/dist/utils';
// import data from './london-spots.json';
let pageSize = 50;
let zoomSize = 16;

const places = []

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
      <Button onClick={toggleTracking} style={{ position: 'absolute', top:'93.5%', left: 0, zIndex: 4000, width:'185px' }}>
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
    places.push(data[iter]);
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

  function displayResult(result){
    console.log(result)
  }
  
  //either postocde or reference as a string or an array of x and y coordiantes
  function filterByRadius(radius) {
    //There is an approximation as latitude and longitude have slightly dfferent magnitudes when converting from km
    radius = radius/110.7
    //TEMPORARY
    const location = [0,0]
    
    const valid = []
    function findValid(xCoord,yCoord,radius){
      for (let i=0; i < places.length; i++) {
        const displacementY = places[i]["longitude"] - yCoord
        const displacementX = places[i]["latitude"] - xCoord
        const distance = ((displacementX**2)+(displacementY**2))**0.5
        if (distance <=radius) {
          valid.push(places[i]["title"])
        }
      }
      displayResult(valid)
    }
    // check if input is postcode then focus on it if valid
    const postcodeRegex = /^[A-Z]{1,2}[0-9RCHNQ][0-9A-Z]?\s?[0-9][ABD-HJLNP-UW-Z]{2}$|^[A-Z]{2}-?[0-9]{4}$/;
      if (location.length === 2){
        const xCoord = location[0]
        const yCoord = location[1]
        return findValid(xCoord,yCoord,radius)
      }
      try{
        if (postcodeRegex.test(location.toUpperCase())){
          let postcodeCoords = fetchPostCode(location);
          if (postcodeCoords !== 'failed!') {
            const xCoord = postcodeCoords[1]
            const yCoord = postcodeCoords[0]
            return findValid(xCoord,yCoord,radius)
          }
          else {document.getElementById("errorMsg").innerHTML = "Please enter a valid postcode";}
        } 
      } 
      catch(err){console.log("Couldn't make uppercase")}
      // check if input is reference number and focus on it if found
      
        for (const entry of geojson.features) {
          if (entry.properties.reference === location) {
            try{const xCoord = entry.geometry.coordinates[1]
                const yCoord = entry.geometry.coordinates[0]
                return findValid(xCoord,yCoord,radius)
              }
            catch(err){document.getElementById("errorMsg").innerHTML = "No valid coordinates attached to this location";}
          }   
      }
    }
    
  
  
  


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
        try{map.flyTo([entry.geometry.coordinates[1], entry.geometry.coordinates[0]], 18);}
        catch(err){document.getElementById("errorMsg").innerHTML = "No valid coordinates attached to this location";}
        
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

  const searchForRadius = async() => {
    if (!map) {return}
    
    document.getElementById("errorMsg").innerHTML = "";
    const searchInputRadius = document.getElementById('searchInputRadius').value;
    
    filterByRadius(searchInputRadius)
  };

  const toggleShow = async() => {
      if (!map) {return}
      document.getElementById("errorMsg").innerHTML = "";
      var x = document.getElementsByClassName("filterdropdown");
      for (let i=0; i < x.length; i++){
        if (x[i].style.display === "none") {
          x[i].style.display = "block";
        } else {
          x[i].style.display = "none";
        }
      }
    
  };

  const bindSearchToEnter = () => {
    var input = document.getElementById("searchInput");
    if (input === null) { return }
    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        document.getElementById("searchBtn").click();
      }
    });
  }

  const bindSearchToEnterRadius = () => {
    var input = document.getElementById("searchInputRadius");
    if (input === null) { return }
    input.addEventListener("keypress", function (event) {
      if (event.key === "Enter") {
        document.getElementById("searchBtnRadius").click();
      }
    });
  }

  bindSearchToEnter();
  bindSearchToEnterRadius();

  //displays in log untill place to display on website is made
  //console.log(filterByRadius(places,"23-00453-LDCP",5))
  //console.log(filterByRadius(places,[51,0],100))
  console.log(places)

  

  if (loading) {return (<div>Loading...</div>);}

  return (
    <div>
      <HintText>Enter a reference number or postcode</HintText>
      <SearchBox>
        <SearchBox.Input id="searchInput" placeholder="Type here" />
        <SearchBox.Button id="searchBtn" onClick={search} />
        <Button id="filterbutton" style={{position: "absolute", right:416, top: 291,height: 38, width: 80}} onClick={toggleShow}>Filter</Button>
      </SearchBox>
      <br></br>
      
      <div class="filterdropdown"> 
      <Select
        style ={{position: "relative",width: 500,left:710, top:25,zIndex:5000}}
        input={{
          id: 'selectionid',
          name: 'filterSelect',
          onChange: function filterPlaces() {
            const meetCond = [];
          for (let i=0; i < places.length; i++) {
            if (places[i]["status"] === document.getElementById("selectionid").value) {meetCond.push(places[i]["title"])}
          }
          console.log(meetCond)
          }
        }}
        
      >
        <option value="0" selected = "selected">Filter by Status</option>
        <option value="not_started">Not Started</option>
        <option value="in_assessment">In Assessment</option>
        <option value="assessment_in_progress">Assessment in Progress</option>
        <option value="awaiting_determination">Awaiting Determination</option>
        <option value="in_committee">In Committee</option>
        <option value="determined">Determined</option>
        <option value="returned">Returned</option> 
      </Select>
      </div>
      <div class="filterdropdown">
      <SearchBox class="filterdropdown" style={{position:"relative", left:710,top:25,zIndex:5000}}>
        <SearchBox.Input id = "searchInputRadius" placeholder="Filter by radius (km)" style={{position:"relative" ,width: 204, top: 2}}/>
        <SearchBox.Button id="searchBtnRadius" style={{position:"relative",top:2}} onClick={searchForRadius}/>
      </SearchBox>
      </div>
      
      
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
