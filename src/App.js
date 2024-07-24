import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { SearchBox, ErrorText, HintText } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';
import axios from 'axios';
import LocationMarker from './LocationMarker';
import $ from 'jquery';
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

// const fetchApplicationDocs = async(ref) => {
//   try {
//     const response = await axios.get(apiUrl + ref + "/documents");
//     return response.data;
//   } catch (e) {
//     console.log(e);
//   }
// }

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
        "name" : data[iter]["title"],
        "description" : data[iter]["description"],
        "status" : data[iter]["status"],
        "reference" : data[iter]["reference"],
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
        saveGeoData(geojson);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
  
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //saving/loading geojson data to localstorage so that refresh does not reset the table
  const saveGeoData = async(data) => {
    let loaded = false;
    loaded = await(!loading);
    if (loaded) {
      localStorage.setItem('geojsonData', JSON.stringify(data));
    }
  }

  const loadGeoData = async() => {
    let loaded = false;
    loaded = await(!loading);
    if (loaded) {
      const data = localStorage.getItem('geojsonData');
      return data ? JSON.parse(data) : null;
    }
  }

  const populateTable = async(data) => {
    let loaded = false;
    loaded = await(!loading);
    if (loaded) {
      $("#applicationTableBody").empty();

      for (let i = 0; i < Object.keys(data.features).length; i++) {
        var feature = data.features[i].properties;

        let featureHTML = `<tr class='govuk-table__row'>
          <td class='govuk-table__cell'>${addresize(feature.name)} </td>
          <td class='govuk-table__cell'>${feature.reference}</td>
          <td class='govuk-table__cell'>${feature.description}</td>
          <td class='govuk-table__cell'>${humanize(feature.status)}</td>`;
        
        if (feature.publicUrl === undefined) { featureHTML += `<td class='govuk-table__cell'>N/A</td></tr>`;}
        
        else { 
          featureHTML += `<td class='govuk-table__cell'><a class='govuk-link' href='${feature.publicUrl}' target='_blank'>More info</a></td></tr>`;
        }

        $("#applicationTable").find('tbody').append(featureHTML);
      }
    }
  }

  function filterTable(){
    var table = document.getElementById("applicationTable");
    var tr = table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
      var td = tr[i].getElementsByTagName("td")[3];
      if (td) {
        if (("None" === document.getElementById("filterSelect").value)) {
          tr[i].style.display = "";
        }
        else if (td.innerText === document.getElementById("filterSelect").value) {
          tr[i].style.display = "";
        }
        else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.description && feature.properties.status && feature.properties.publicUrl) {

      const div = document.createElement('div');
      div.innerHTML = `<h3 class="govuk-heading-m" style="font-size: 20px">${addresize(feature.properties.name)}</h3>
        <p class="govuk-body" style="font-size: 14px">Reference: ${feature.properties.reference}</p>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>
        <p class="govuk-body" style="font-size: 14px">Current status: ${humanize(feature.properties.status)}</p>
        <a class="govuk-link" style="font-size: 14px" href="${feature.properties.publicUrl}" target="_blank">More info</a>`;
      layer.bindPopup(div);
    }
    else if (feature.properties && feature.properties.description && feature.properties.status) {

      const div = document.createElement('div');
      div.innerHTML = `<h3 class="govuk-heading-m" style="font-size: 20px">${addresize(feature.properties.name)}</h3>
        <p class="govuk-body" style="font-size: 14px">Reference: ${feature.properties.reference}</p>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>
        <p class="govuk-body" style="font-size: 14px">Current status: ${feature.properties.status}</p>`;

      // const button = document.createElement('button');
      // button.innerHTML = "More info";
      // button.onclick = async function(){console.log(await fetchApplicationDocs(feature.properties.reference))};
      // div.appendChild(button);

      layer.bindPopup(div);
    }
    else if (feature.properties && feature.properties.description) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${addresize(feature.properties.name)}</h3>
        <p class="govuk-body" style="font-size: 14px">Planned work: ${feature.properties.description}</p>`);
    }
    else if (feature.properties) {
      layer.bindPopup(`<h3 class="govuk-heading-m" style="font-size: 20px">${addresize(feature.properties.name)}</h3>`);
    }
  };

  const search = async() => {
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

  $(document).ready(async() => {
    populateTable(await loadGeoData());
  });

  return (
    <div>
      <div>
        <HintText>Enter a reference number or postcode</HintText>
        <SearchBox>
          <SearchBox.Input id="searchInput" placeholder="Type here" />
          <SearchBox.Button id="searchBtn" onClick={search} />
        </SearchBox>
        <ErrorText id="errorMsg"></ErrorText>
        <div data-testid="mapContainer" style={{ height: 'calc(100% - 30px)', position: 'relative' }} >
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
      <div>
        <br />
        <details className="govuk-details">
          <summary className="govuk-details__summary">
            <span className="govuk-details__summary-text">
              View applications as a table
            </span>
          </summary>
          <div className="govuk-form-group">
            <label className="govuk-label" for="sort">
              Filter by status
            </label>
            <select className="govuk-select" id="filterSelect" name="filterSelect" onChange={filterTable}>
              <option value="None">None</option>
              <option value="In assessment">In assessment</option>
              <option value="Awaiting determination" selected>Awaiting determination</option>
              <option value="Determined">Determined</option>
              <option value="In committee">In committee</option>
              <option value="Not started">Not started</option>
            </select>
          </div>
          <table className="govuk-table" id="applicationTable">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">Address</th>
                <th scope="col" className="govuk-table__header">Reference number</th>
                <th scope="col" className="govuk-table__header">Description</th>
                <th scope="col" className="govuk-table__header">Current Status</th>
                <th scope="col" className="govuk-table__header" style={{ whiteSpace: 'nowrap' }}>More info</th>
              </tr>
            </thead>
            <tbody className="govuk-table__body" id="applicationTableBody"></tbody>
          </table>
        </details>
      </div>
    </div>
  );
}

export default App;
