import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; 
import App from './App';

test('Loading... is shown on site', () => {
  render(<App />);
  const loadingElement = screen.getByText(/Loading.../);
  expect(loadingElement).toBeInTheDocument();
});
