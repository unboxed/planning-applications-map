import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; 
import App from './App';
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

jest.mock('./components/LocationMarker', () => {
  return jest.fn(() => <div>Mocked LocationMarker</div>);
});

jest.mock('./components/SearchArea', () => {
  return jest.fn(() => <div>Mocked SearchArea</div>);
});

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
            receivedAt: '2024-07-24',
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

  await waitForElementToBeRemoved(() => screen.queryByText('Loading...'));

  const mapElement = await waitFor(() => screen.getByTestId('mapContainer'));
  expect(mapElement).toBeInTheDocument();

  const referenceElement = await waitFor(() => screen.queryByText('21-12345'));
  const descriptionElement = await waitFor(() => screen.queryByText('Test Proposal'));
  const statusElement = await waitFor(() => screen.queryByText('Pending'));
  expect(referenceElement).toBeInTheDocument();
  expect(descriptionElement).toBeInTheDocument();
  expect(statusElement).toBeInTheDocument();
});

test("Status filter can exclude some values", async () => {
  axios.get.mockResolvedValue({
    data: {
      data: {
        0: {
          property: {
            address: {
              singleLine: "123 Test St",
              latitude: 51.505,
              longitude: -0.09,
            },
          },
          application: {
            status: "Pending",
            reference: "21-12345",
            receivedAt: "2024-07-24",
          },
          proposal: {
            description: "Test Proposal",
          },
        },
        1: {
          property: {
            address: {
              singleLine: "123 Test St",
              latitude: 51.505,
              longitude: -0.09,
            },
          },
          application: {
            status: "Returned",
            reference: "21-56789",
            receivedAt: "2024-07-24",
          },
          proposal: {
            description: "Test Proposal",
          },
        },
      },
      links: { next: null },
    },
  });

  render(<App />);

  await waitForElementToBeRemoved(() => screen.queryByText("Loading..."));
  const mapElement = await waitFor(() => screen.getByTestId("mapContainer"));
  expect(mapElement).toBeInTheDocument();

  const referenceElement1 = await waitFor(() => screen.queryByText("21-12345"));
  const referenceElement2 = await waitFor(() => screen.queryByText("21-56789"));
  expect(referenceElement1).toBeInTheDocument();
  expect(referenceElement2).toBeInTheDocument();

  const filterSelect = document.querySelector("#filterSelect");
  filterSelect.value = "Returned";
  filterSelect.dispatchEvent(new CustomEvent("change", { bubbles: true }));

  expect(referenceElement1.parentElement.style.display).toEqual("none");
  expect(referenceElement2.parentElement.style.display).not.toEqual("none");
});
