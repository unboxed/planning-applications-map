import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button, SearchBox, ErrorText, HintText, Table} from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import { DivIcon, Circle} from 'leaflet';
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
  let parsedData = applicationData || {};
  let endDate = "N/A";
  let startDate = "N/A";
    for (let i = 0; i < Object.keys(data.data).length; i++) {
      var currentApplication = data.data[i.toString()];
      if (Object.keys(currentApplication["application"]).length == 10){ // ALEX NOTE: This needs to be changed so it actually works. When i = 11 start and end dates are both null. Not just i = 11 but that is the first instance.
      endDate = currentApplication["application"]["consultation"]["endDate"];
      startDate = currentApplication["application"]["consultation"]["startDate"];}
      parsedData[(i + iter * pageSize).toString()] = {
        "title" : currentApplication["property"]["address"]["singleLine"],
        "latitude" : currentApplication["property"]["address"]["latitude"],
        "longitude" : currentApplication["property"]["address"]["longitude"],
        "status" : currentApplication["application"]["status"],
        "reference" : currentApplication["application"]["reference"],
        "description" : currentApplication["proposal"]["description"],
        "postcode": currentApplication["property"]["address"]["postcode"],
        "startDate": startDate,
        "endDate": endDate
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

function generateNumbers(N){
  let indexArray = []
  for(let i = 0; i<N; i++){
    indexArray.push(i.toString());
  }
  return{indexArray}
}

function loadTable(applicationData, indexes){
  const tableSize = 25;
  // ALEX NOTE: indexValues is an attempt to add sorting functionality. IndexValues is an array which stores the index values of the dictionary correspoding to the ascending order of start dates. 
  let indexValues = indexes || generateNumbers(tableSize);
  // Two customisable arrays determining the collumn values of the table (dataHeaders refers to the location of the data in the applicationData dictionary)
  const dataHeaders = ["title", "startDate", "endDate", "status", "reference"]
  const headers = ["Name", "Start Date", "Expiry date", "Status", "Reference"]
  // Generating the heading
  let tableHTML = '<thead class="govuk-table__head"><tr class="govuk-table__row">'
  for (let i = 0; i < headers.length; i++){
    tableHTML += '<th scope="col" class="govuk-table__header">' + headers[i] + '</th>'
  }
  tableHTML += '</tr></thead><tbody class="govuk-table__body">'
  // Generating the rows
  for(let i = 0; i < tableSize; i++){
    tableHTML += '<tr class="govuk-table__row">'
    for(let j = 0; j < dataHeaders.length; j++){
     tableHTML += '<td>'
     // Different method depending on whether and indexes array was given as a parameter
     tableHTML += (applicationData[parseInt(indexValues.indexArray[i])][dataHeaders[j]])
     tableHTML += '</td>'
    }
    tableHTML += '</tr>';
  }
  // ALEX NOTE: Because of this line, this function needs to be called after loading is set to false
  document.getElementById("mapTable").innerHTML = tableHTML;
}
// function aims to create an array of indexes correspoding to the ascending order of dates
// ALEX NOTE: This function doesn't work
function latestDate(applicationData){
    // center allows for functionality based on distance from current centre of the map (probably should be changed to user's location)
    let dumpDict = []
    let sortedDict = []
    let indexes = []
    // formats the dictionary data into an array with dates without the hyphens
    for (let i =0; i < Object.keys(applicationData).length; i++){
        dumpDict.push(applicationData[i]["startDate"])    
    }
    sortedDict = dumpDict.sort()
    for(let i = 0; i< sortedDict.length; i++){
      indexes.push(dumpDict.indexOf(sortedDict[i].toString()))
    }
    return{indexes}
}

function App () {

  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  
  useEffect(() => {
    let parsedData = {}
    const loadData = async() => {
      // parse first page's data
      let currentPageData = await fetchData('https://southwark.bops-staging.services/api/v2/public/planning_applications/search');
      parseJSON(currentPageData, 0, parsedData)
      let i = 1;

      // iterate through all other pages and parse data
      while (currentPageData.links.next != null) {
        currentPageData = await fetchData(currentPageData.links.next);
        parseJSON(currentPageData, i, parsedData)
        i++;
      }
      let applicationData = parsedData
      setGeojson(toGeoJSON(parsedData));
      setLoading(false);
      loadTable(applicationData)
    }
    
  loadData();
  setLoading(false);
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
    document.getElementById("errorMsg").style.marginTop = "5px";
    document.getElementById("errorMsg").style.marginBottom = "7px";
    const searchInput = document.getElementById('searchInput').value;
    
    // check if input is reference number and focus on it if found
    var correctReference = false
    for (const entry of geojson.features) {
      if (entry.properties.reference === searchInput) {
        map.flyTo([entry.geometry.coordinates[1], entry.geometry.coordinates[0]], 18);
        correctReference = true
      }
    }
    // given that input is not a valid reference, checks if input is in reference format and outputs corresponding error if true
    const referenceRegex = /^[0-9]{2}-?[0-9]{5}-?[0-9A-Z]{4,8}/;
    if (referenceRegex.test(searchInput.toUpperCase()) && correctReference === false) {
      {document.getElementById("errorMsg").innerHTML = "Please enter a valid reference";}
    }
    else{
      // check if input is postcode then focus on it if valid
      const postcodeRegex = /^[A-Z0-9]{2,4}\s?[A-Z0-9]{3}$/;
      if (postcodeRegex.test(searchInput.toUpperCase())){
        let postcodeCoords = await fetchPostCode(searchInput);
        if (postcodeCoords !== 'failed!') {
          map.flyTo([postcodeCoords[1], postcodeCoords[0]], zoomSize);
        }
        else {document.getElementById("errorMsg").innerHTML = "Please enter a valid postcode";}
      }
      else {document.getElementById("errorMsg").innerHTML = "Please enter a valid postcode or reference";}
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

  bindSearchToEnter();

  if (loading) {return (<div>Loading...</div>);}

  return (
    
    <div>
      
      <HintText>Enter a reference number or postcode</HintText>
      <SearchBox>
        <SearchBox.Input id="searchInput" placeholder="Type here" />
        <SearchBox.Button id="searchBtn" onClick={search} />
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
      <div id = "sortBy" class="govuk-form-group">
        <label class="govuk-label" for="sort">
          Sort by
        </label>
        <select class="govuk-select" id="sort" name="sort">
          <option value="default">Order</option>
          <option value="startDate"selected>Recently started</option>
          <option value="views">Most views</option>
          <option value="comments">Most comments</option>
        </select>
      </div>
      <Table id="mapTable">
        
      </Table>
    </div>

  
  );
  
}

export default App;
