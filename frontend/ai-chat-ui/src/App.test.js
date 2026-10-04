import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ThemeContext } from './context/ThemeContext';
import Login from './pages/Login';

test('login page links to account recovery', () => {
  render(
    <AuthContext.Provider value={{ login: jest.fn() }}>
      <ThemeContext.Provider value={{ darkMode: false }}>
        <MemoryRouter><Login /></MemoryRouter>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );

  expect(screen.getByRole('heading', { name: /login to chatbot/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute('href', '/forgot-password');
});
