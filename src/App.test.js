import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; 
import App from './App';
import * as bruh from './App';
import axios from 'axios';

jest.mock('axios');

jest.mock('react-leaflet', () => {
  const originalModule = jest.requireActual('react-leaflet');
  return {
    ...originalModule,
    MapContainer: jest.fn(({ children }) => <div>{children}</div>),
    TileLayer: jest.fn(() => <div>TileLayer</div>),
    GeoJSON: jest.fn(() => <div>GeoJSON</div>),
    Marker: jest.fn(() => <div>Marker</div>),
    Popup: jest.fn(() => <div>Popup</div>),
  };
});

jest.mock('./LocationMarker', () => {
  return jest.fn(() => <div>Mocked LocationMarker</div>);
});

bruh.populateTable = jest.fn().mockReturnValue({data: {features: {name: "teest"}}});

test('Loading... is shown on site', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Loading.../);
  expect(loadingElement).toBeInTheDocument();
});

test('Map renders', async() => {
  axios.get.mockResolvedValue({
    data: {
      data: {
        '0': {
          property: {
            address: {
              singleLine: '123 Test St',
              latitude: 51.505,
              longitude: -0.09,
            },
          },
          application: {
            status: 'Pending',
            reference: '21-12345',
          },
          proposal: {
            description: 'Test Proposal',
          },
        },
      },
      links: { next: null },
    },
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  await waitFor(() => {
    const mapElement = screen.queryByTestId('mapContainer');
    expect(mapElement).toBeInTheDocument();
  });
})
