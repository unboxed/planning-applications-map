import { render, screen } from '@testing-library/react';
import App from './App.js';

test('Header is shown on site', () => {
    render(<App />);
    const headerElement = screen.getByText(/Map of current planning applications/);
    expect(headerElement).toBeInTheDocument();
});

// test('test for error', () => {
//     let errorMsg;
//     try {render(<App />);}
//     catch(e) {errorMsg = e;}
//     expect(errorMsg).toEqual("await is only valid in async functions and the top level bodies of modules");
// });