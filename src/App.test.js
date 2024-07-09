import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; 
import App from './App';

test('Header is shown on site', () => {
  render(<App />);
  const headerElement = screen.getByText(/Show My Location/);
  expect(headerElement).toBeInTheDocument();
});
