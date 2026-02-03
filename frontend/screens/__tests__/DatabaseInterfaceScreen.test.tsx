/**
 * React Testing Library Tests for Database Interface Screen
 * Component integration tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import DatabaseInterfaceScreen from '../../../screens/admin/DatabaseInterfaceScreen';
import * as databaseInterface from '../../../services/database-interface';

// Mock the service
jest.mock('../../../services/database-interface');
jest.mock('../../../hooks/useWindowsDetection', () => ({
  __esModule: true,
  default: () => ({
    isWindowsPC: true,
    isPlatformAllowed: true,
    platformWarning: null,
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('DatabaseInterfaceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderScreen = () => {
    return render(
      <NavigationContainer>
        <DatabaseInterfaceScreen navigation={mockNavigation} />
      </NavigationContainer>
    );
  };

  describe('Platform Detection', () => {
    it('should show access denied when not on Windows PC', () => {
      jest.mock('../../../hooks/useWindowsDetection', () => ({
        __esModule: true,
        default: () => ({
          isWindowsPC: false,
          isPlatformAllowed: false,
          platformWarning: 'This feature is only available on Windows PC',
        }),
      }));

      renderScreen();

      expect(screen.getByText(/Access Restricted/i)).toBeTruthy();
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
        expect(screen.getByText(/error/i)).toBeTruthy();
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

      await waitFor(
        () => {
          expect(databaseInterface.getDatabaseUsers).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'john' })
          );
        },
        { timeout: 500 }
      );
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

      await waitFor(() => {
        const nextButton = screen.getByText(/Next/i);
        fireEvent.press(nextButton);
      });

      await waitFor(() => {
        expect(databaseInterface.getDatabaseUsers).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
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

      await waitFor(() => {
        const nextButton = screen.getByText(/Next/i);
        expect(nextButton.props.accessibilityState.disabled).toBe(true);
      });
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

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.press(checkboxes[0]);
      });

      // Should show bulk actions
      await waitFor(() => {
        expect(screen.getByText(/1 selected/i)).toBeTruthy();
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
