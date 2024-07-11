import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; 
import App from './App';

test('Location button is shown on site', () => {
  render(<App />);
  const buttonElement = screen.getByText(/Show My Location/);
  expect(buttonElement).toBeInTheDocument();
});
