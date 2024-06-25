import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Popup, Marker, useMap, GeoJSON } from 'react-leaflet';
import { Button } from 'govuk-react';
import './App.css';
import './govuk-styles.scss';

import { DivIcon } from 'leaflet';
import data from './london-spots.json';

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
      <Button onClick={toggleTracking} style={{ position: 'absolute', zIndex: 1000 }}>
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

function App () {

  const onEachFeature = (feature, layer) => {
    if (feature.properties && feature.properties.description) {
      layer.bindPopup(`<h3>${feature.properties.name}</h3><p>${feature.properties.description}</p>`);
    }
  };

  return (
    <div>
      <header className="govuk-header" role="banner" data-module="govuk-header">
        <div className="govuk-header__container govuk-width-container">
          <div className="govuk-header__logo">
            <a href="/" className="govuk-header__link govuk-header__link--homepage">
              <span className="govuk-header__logotype">
                <img src="https://assets.publishing.service.gov.uk/government/uploads/system/uploads/govuk_logotype_crown.png" alt="GOV.UK" />
                <span className="govuk-header__logotype-text">GOV.UK</span>
              </span>
            </a>
          </div>
          <div className="govuk-header__content">
            <nav className="govuk-header__navigation" aria-label="Top Level Navigation">
              <a className="govuk-header__link" href="#">Home</a>
              <a className="govuk-header__link" href="#">About</a>
              <a className="govuk-header__link" href="#">Contact</a>
            </nav>
          </div>
        </div>
      </header>

      <main className='govuk-main-wrapper'>
        <div style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
          <MapContainer center={[51.505, -0.09]} zoom={13}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[51.505, -0.09]}>
              <Popup>
                A pretty CSS3 popup. <br /> Easily customizable.
              </Popup>
            </Marker>
            <GeoJSON data={data} onEachFeature={onEachFeature} />
            <LocationMarker />
          </MapContainer>
        </div>
      </main>

      <footer className="govuk-footer" role="contentinfo">
        <div className="govuk-width-container">
          <div className="govuk-footer__meta">
            <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
              <h2 className="govuk-visually-hidden">Support links</h2>
              <ul className="govuk-footer__inline-list">
                <li className="govuk-footer__inline-list-item"><a className="govuk-footer__link" href="#">Privacy</a></li>
                <li className="govuk-footer__inline-list-item"><a className="govuk-footer__link" href="#">Terms</a></li>
                <li className="govuk-footer__inline-list-item"><a className="govuk-footer__link" href="#">Contact</a></li>
              </ul>
            </div>
            <div className="govuk-footer__meta-item">
              <svg role="presentation" focusable="false" className="govuk-footer__licence-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 483.2 195.7" height="17" width="41">
                <path fill="currentColor" d="M421.5 0H293.3c-1.8 0-3.5 0.8-4.6 2.1L261 34.8c-1.2 1.5-1.9 3.4-1.9 5.4v53.5c0 2.1 0.8 4.1 2.2 5.5l27.1 29.6c1.2 1.3 2.9 2.1 4.7 2.1h128.4c2.1 0 4.2-0.9 5.6-2.4l28.6-29.5c1.5-1.5 2.3-3.6 2.3-5.8V37.4c0-2-0.7-3.9-2-5.4L426.1 2.2C424.8 0.8 423.1 0 421.5 0z"></path>
              </svg>
              <span className="govuk-footer__licence-description">
                All content is available under the <a className="govuk-footer__link" href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" rel="license">Open Government Licence v3.0</a>, except where otherwise stated
              </span>
            </div>
            <div className="govuk-footer__meta-item govuk-footer__meta-item--grow">
              <svg role="presentation" focusable="false" className="govuk-footer__copyright-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 483.2 195.7" height="17" width="41">
                <path fill="currentColor" d="M421.5 0H293.3c-1.8 0-3.5 0.8-4.6 2.1L261 34.8c-1.2 1.5-1.9 3.4-1.9 5.4v53.5c0 2.1 0.8 4.1 2.2 5.5l27.1 29.6c1.2 1.3 2.9 2.1 4.7 2.1h128.4c2.1 0 4.2-0.9 5.6-2.4l28.6-29.5c1.5-1.5 2.3-3.6 2.3-5.8V37.4c0-2-0.7-3.9-2-5.4L426.1 2.2C424.8 0.8 423.1 0 421.5 0z"></path>
              </svg>
              <span className="govuk-footer__licence-description">
                &copy; Crown copyright
              </span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;