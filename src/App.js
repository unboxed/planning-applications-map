import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { SearchBox, ErrorText, HintText, Button } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import LocationMarker from './components/LocationMarker';
import { searchMapArea } from './components/SearchArea';
import { populateTable, filterTable, sortTable } from './components/Table';
// import data from './london-spots.json';
let pageSize = 50;
let zoomSize = 16;
let apiUrl = "https://southwark.bops-staging.services/api/v2/public/planning_applications/";

function humanize(str) {
  return str
    .replace(/^[\s_]+|[\s_]+$/g, '')
    .replace(/[_\s]+/g, ' ')
    .replace(/^[a-z]/, function (m) { return m.toUpperCase(); });
}

function addresize(str) {
  return str
    .replace(/[A-Z]+/g, function(m) { return m.toLowerCase(); })
    .replace(/^[a-z]|\s+[a-z]/g, function(m) { return m.toUpperCase(); })
    .replace(/[a-z].{0,8}$/, function(m) { return m.toUpperCase(); });
}

const fetchData = async (link) => {
  try {
    const response = await axios.get(link, {
      params: { maxresults: pageSize },
    });

    if (response && response.data) {
      return response.data;
    } else {
      console.error('No data found in response:', response);
      return null;
    }
  } catch (e) {
    console.error('Error fetching data:', e);
    return null;
  }
};

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

function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
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
      "recvDate" : currentApplication["application"]["receivedAt"].slice(0,10),
      "description" : currentApplication["proposal"]["description"],
    }
    if (currentApplication["application"].hasOwnProperty("consultation")) {
      var urlEntry = {"publicUrl": currentApplication["application"]["consultation"]["publicUrl"]};
      Object.assign(applicationData[(i + iter * pageSize).toString()], urlEntry);
    }
    if (currentApplication["application"]["reference"] === "23-00512-translation missing: en.application_type_codes.planning_permission.existing") { 
      applicationData[(i + iter * pageSize).toString()].reference = "21";
    } // REMOVE ME IN PROD!!
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
        "name" : addresize(data[iter]["title"]),
        "description" : data[iter]["description"],
        "status" : humanize(data[iter]["status"]),
        "reference" : data[iter]["reference"],
        "recvDate" : data[iter]["recvDate"],
        "publicUrl" : data[iter]["publicUrl"],
      },
    });
  }
  return result;
}

function App () {

  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [map, setMap] = useState(null);
  let toDisplay, allResults = [];
  
  useEffect(() => {
    let applicationData = {};
  
    const loadData = async () => {
      try {
        // Parse first page's data
        let currentPageData = await fetchData(apiUrl + 'search');
        if (!currentPageData) {
          console.error('Failed to load initial data.');
          return;
        }
        parseJSON(currentPageData, 0, applicationData);
        let i = 1;
  
        // Iterate through all other pages and parse data
        while (currentPageData.links.next != null) {
          currentPageData = await fetchData(currentPageData.links.next);
          if (!currentPageData) {
            console.error('Failed to load subsequent page data.');
            return;
          }
          parseJSON(currentPageData, i, applicationData);
          i++;
        }
  
        setGeojson(toGeoJSON(applicationData));
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
  
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.description && feature.properties.status && feature.properties.publicUrl) {

      const div = document.createElement('div');
      div.innerHTML = `<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>
        <p class="govuk-body" style="font-size: 14px">Reference: ${feature.properties.reference}</p>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>
        <p class="govuk-body" style="font-size: 14px">Current status: ${feature.properties.status}</p>
        <a class="govuk-link" style="font-size: 14px" href="${feature.properties.publicUrl}" target="_blank">More info</a>`;
      layer.bindPopup(div);
    }
    else if (feature.properties && feature.properties.description && feature.properties.status) {

      const div = document.createElement('div');
      div.innerHTML = `<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>
        <p class="govuk-body" style="font-size: 14px">Reference: ${feature.properties.reference}</p>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>
        <p class="govuk-body" style="font-size: 14px">Current status: ${feature.properties.status}</p>`;
      layer.bindPopup(div);
    }
    else if (feature.properties && feature.properties.description) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>`);
    }
    else if (feature.properties) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${feature.properties.name}</h3>`);
    }
  };

  const searchMapInput = async() => {
    if (!map) {return}
    document.getElementById("errorMsg").innerHTML = "";
    document.getElementById("errorMsg").style.marginTop = "5px";
    document.getElementById("errorMsg").style.marginBottom = "7px";
    const searchInput = document.getElementById('searchInput').value;
    
    // check if input is reference number and focus on it if found
    for (const entry of geojson.features) {
      if (entry.properties.reference === searchInput) {
        map.flyTo([entry.geometry.coordinates[1], entry.geometry.coordinates[0]], 18);
        return;
      }
    }
    // given that input is not a valid reference, checks if input is in reference format and outputs corresponding error if true (Not sure of the exact format so this regex might need to be revised)
    const referenceRegex = /^[0-9]{2}-?[0-9]{5}-?[0-9A-Z]{4,8}/;
    if (referenceRegex.test(searchInput.toUpperCase())) {
      document.getElementById("errorMsg").innerHTML = "Please enter a valid reference";
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

  async function searchArea() {
    if (!map) {return}
    toDisplay = searchMapArea(map);
  }

  async function filterTableArea(event) {
    filterTable(event, toDisplay);
  }

  function resetTable() {
    var tr = document.getElementById("applicationTable").getElementsByTagName("tr");
    for (let i = 0; i < tr.length; i++) {
      tr[i].style.display = "";
    }
    document.getElementById('filterSelect').selectedIndex = 0;
    toDisplay = allResults;
  }

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

  ready(async() => {
    let loaded = await (!loading);
    if (loaded) {
      toDisplay = populateTable(geojson);
      allResults = toDisplay.slice(0);
    }
  });

  return (
    <div>
      <div>
        <HintText>Enter a reference number or postcode</HintText>
        <SearchBox>
          <SearchBox.Input id="searchInput" placeholder="Type here" />
          <SearchBox.Button id="searchBtn" onClick={searchMapInput} />
        </SearchBox>
        <ErrorText id="errorMsg"></ErrorText>
        <div data-testid="mapContainer" style={{ height: '600px', width: '100%', position: 'relative' }} >
          <MapContainer ref={setMap} center={[51.505, -0.09]} zoom={13}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON data={geojson} onEachFeature={onEachFeature} />
            <div>
              <LocationMarker />
              <Button onClick={searchArea} buttonColour="#f3f2f1" buttonHoverColour="#ffdd00" buttonShadowColour="#929191" buttonTextColour="#0b0c0c" 
            style={{ position: 'absolute', bottom: '-4%', marginLeft: "11em", zIndex: 4000, width: '170px' }}>
                Search this area
            </Button>
            </div>
          </MapContainer>
        </div>
        <br />
      </div>
      <div className="parent">
        {/* <div className="govuk-form-group child">
              <label className="govuk-label">
                Search 
              </label>
              <input className="govuk-input govuk-input--width-20" id="tableSearchInput" type="text" onKeyUp={searchTable}></input>
            </div> */}
        <div className="govuk-form-group child">
          <label className="govuk-label">
            Sort by
          </label>
          <select className="govuk-select" id="sortSelect" name="sortSelect" onChange={sortTable} defaultValue={"None"}>
            <option value="None">None</option>
            <option value="date_asc">Oldest first</option>
            <option value="date_des">Newest first</option>
            <option value="ref">Reference number</option>
          </select>
        </div>
        <div className="govuk-form-group child" style={{ marginLeft: "1em" }}>
          <label className="govuk-label">
            Filter by status
          </label>
          <select className="govuk-select" id="filterSelect" name="filterSelect" onChange={filterTableArea} defaultValue={"None"}>
            <option value="None">None</option>
            <option value="Awaiting determination">Awaiting determination</option>
            <option value="Assessment in progress">Assessment in progress</option>
            <option value="Determined">Determined</option>
            <option value="In assessment">In assessment</option>
            <option value="In committee">In committee</option>
            <option value="Not started">Not started</option>
            <option value="Returned">Returned</option>
          </select>
        </div>
        <div className='child'>
          <a className="govuk-link" onClick={resetTable} style={{marginLeft:'1em'}}>Clear all filters</a>
        </div>
      </div>
      <table className="govuk-table" id="applicationTable">
        <thead className="govuk-table__head">
          <tr className="govuk-table__row">
            <th scope="col" className="govuk-table__header">Address</th>
            <th scope="col" className="govuk-table__header">Reference number</th>
            <th scope="col" className="govuk-table__header">Description</th>
            <th scope="col" className="govuk-table__header">Date received</th>
            <th scope="col" className="govuk-table__header">Current Status</th>
            <th scope="col" className="govuk-table__header" style={{ whiteSpace: 'nowrap' }}>More info</th>
          </tr>
        </thead>
        <tbody className="govuk-table__body" id="applicationTableBody"></tbody>
      </table>
    </div>
  );
}

export default App;
