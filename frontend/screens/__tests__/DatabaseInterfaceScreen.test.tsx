/**
 * React Testing Library Tests for Database Interface Screen
 * Component integration tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import DatabaseInterfaceScreen from '../admin/DatabaseInterfaceScreen';
import * as databaseInterface from '../../services/database-interface';
import { ThemeProvider } from '../../theme/ThemeContext';
import { I18nProvider } from '../../i18n';

// Mock the service
jest.mock('../../services/database-interface');

// One shared mock the tests can re-point. jest.mock() is hoisted above the
// test bodies, so calling it *inside* a test does nothing at all.
const mockWindowsDetection = jest.fn();
jest.mock('../../hooks/useWindowsDetection', () => ({
  __esModule: true,
  default: () => mockWindowsDetection(),
}));

const ALLOWED = {
  isWindowsPC: true,
  isPlatformAllowed: true,
  platformWarning: null,
  isWindows: true,
  isMobile: false,
  isTablet: false,
};

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('DatabaseInterfaceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowsDetection.mockReturnValue(ALLOWED);
    // The screen surfaces load failures through handleApiError; under the
    // automock it returns undefined and no banner renders.
    (databaseInterface.handleApiError as jest.Mock).mockImplementation(
      (error: any) => error?.message ?? 'Request failed',
    );
  });

  // The screen reads colours from ThemeProvider and every label through
  // I18nProvider, and throws at render time without either.
  const renderScreen = () => {
    return render(
      <ThemeProvider>
        <I18nProvider>
          <NavigationContainer>
            <DatabaseInterfaceScreen navigation={mockNavigation} />
          </NavigationContainer>
        </I18nProvider>
      </ThemeProvider>
    );
  };

  describe('Platform Detection', () => {
    it('should show access denied when not on Windows PC', () => {
      mockWindowsDetection.mockReturnValue({
        ...ALLOWED,
        isWindowsPC: false,
        isWindows: false,
        isPlatformAllowed: false,
        platformWarning: 'This feature is only available on Windows PC',
      });

      renderScreen();

      expect(screen.getByText(/Access Denied/i)).toBeTruthy();
      expect(screen.getByText(/only available on Windows PC/i)).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tabs', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Users')).toBeTruthy();
        expect(screen.getByText('Instructors')).toBeTruthy();
        expect(screen.getByText('Students')).toBeTruthy();
        expect(screen.getByText('Bookings')).toBeTruthy();
        expect(screen.getByText('Reviews')).toBeTruthy();
        expect(screen.getByText('Schedules')).toBeTruthy();
      });
    });

    it('should switch tabs on click', async () => {
      const mockData = {
        data: [],
        meta: { total: 0, page: 1, page_size: 20, total_pages: 0 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);
      (databaseInterface.getDatabaseInstructors as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      const instructorsTab = screen.getByText('Instructors');
      fireEvent.press(instructorsTab);

      await waitFor(() => {
        expect(databaseInterface.getDatabaseInstructors).toHaveBeenCalled();
      });
    });
  });

  describe('Data Loading', () => {
    it('should display loading state', async () => {
      (databaseInterface.getDatabaseUsers as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderScreen();

      expect(screen.getByText(/Loading/i)).toBeTruthy();
    });

    it('should display data when loaded', async () => {
      const mockData = {
        data: [
          { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com', role: 'STUDENT' },
        ],
        meta: { total: 1, page: 1, page_size: 20, total_pages: 1 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('john@example.com')).toBeTruthy();
      });
    });

    it('should display error message on failure', async () => {
      (databaseInterface.getDatabaseUsers as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderScreen();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should call API with search term', async () => {
      const mockData = {
        data: [],
        meta: { total: 0, page: 1, page_size: 20, total_pages: 0 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.changeText(searchInput, 'john');

      // Positional signature: (page, pageSize, search, filterRole, filterStatus, sort)
      await waitFor(() => {
        expect(databaseInterface.getDatabaseUsers).toHaveBeenCalledWith(
          1,
          expect.any(Number),
          'john',
          undefined,
          undefined,
          expect.any(String),
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should navigate to next page', async () => {
      const mockData = {
        data: [{ id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' }],
        meta: { total: 50, page: 1, page_size: 20, total_pages: 3 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      // Wait for the first page to land: until it does totalPages is 0 and the
      // button is disabled, so the press would be a no-op.
      await screen.findByText('John Doe');

      // Grab the Pressable by its accessible name — getByText would return the
      // inner <Text>, which carries neither the handler nor the a11y state.
      const nextButton = screen.getByLabelText('Go to next page');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(databaseInterface.getDatabaseUsers).toHaveBeenCalledWith(
          2,
          expect.any(Number),
          expect.any(String),
          undefined,
          undefined,
          expect.any(String),
        );
      });
    });

    it('should disable next button on last page', async () => {
      const mockData = {
        data: [],
        meta: { total: 20, page: 1, page_size: 20, total_pages: 1 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      const nextButton = await screen.findByLabelText('Go to next page');
      expect(nextButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should select rows with checkboxes', async () => {
      const mockData = {
        data: [
          { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
          { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
        ],
        meta: { total: 2, page: 1, page_size: 20, total_pages: 1 },
      };

      (databaseInterface.getDatabaseUsers as jest.Mock).mockResolvedValue(mockData);

      renderScreen();

      await waitFor(() => expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1));

      // [0] is the header select-all; [1] is the first data row.
      fireEvent.press(screen.getAllByRole('checkbox')[1]);

      await waitFor(() => {
        expect(screen.getByText(/1 row selected/i)).toBeTruthy();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should show export buttons', async () => {
      renderScreen();

      await waitFor(() => {
        expect(screen.getByText(/CSV/i)).toBeTruthy();
        expect(screen.getByText(/Excel/i)).toBeTruthy();
        expect(screen.getByText(/PDF/i)).toBeTruthy();
      });
    });
  });
});
