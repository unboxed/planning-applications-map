import { render, screen } from '@testing-library/react';
import App from './App.js';

test('Header is shown on site', () => {
    render(<App />);
    const headerElement = screen.getByText(/Map of current planning applications/i);
    expect(headerElement).toBeInTheDocument();
});