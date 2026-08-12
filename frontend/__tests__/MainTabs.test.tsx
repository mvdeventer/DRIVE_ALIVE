import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import MainTabs from '../navigation/MainTabs';
import { useAuthActions } from '../navigation/AuthContext';

jest.mock('../navigation/AuthContext', () => ({
  useAuthActions: jest.fn(),
}));

jest.mock('../navigation/AdminTabs', () => {
  const { Text } = require('react-native');
  return function AdminTabsMock() {
    return <Text testID="admin-tabs">Admin Tabs</Text>;
  };
});

jest.mock('../navigation/CompanyAdminTabs', () => {
  const { Text } = require('react-native');
  return function CompanyAdminTabsMock() {
    return <Text testID="company-admin-tabs">Company Admin Tabs</Text>;
  };
});

jest.mock('../navigation/InstructorTabs', () => {
  const { Text } = require('react-native');
  return function InstructorTabsMock() {
    return <Text testID="instructor-tabs">Instructor Tabs</Text>;
  };
});

jest.mock('../navigation/StudentTabs', () => {
  const { Text } = require('react-native');
  return function StudentTabsMock() {
    return <Text testID="student-tabs">Student Tabs</Text>;
  };
});

const mockedUseAuthActions = useAuthActions as jest.Mock;

describe('MainTabs role guard', () => {
  beforeEach(() => {
    mockedUseAuthActions.mockReset();
  });

  it('renders admin tabs for admin role', () => {
    mockedUseAuthActions.mockReturnValue({
      userRole: 'admin',
      onLogout: jest.fn(),
      userName: 'Admin',
    });

    const { getByTestId } = render(<MainTabs />);
    expect(getByTestId('admin-tabs')).toBeTruthy();
  });

  it('renders company admin tabs for company_admin role', () => {
    mockedUseAuthActions.mockReturnValue({
      userRole: 'company_admin',
      onLogout: jest.fn(),
      userName: 'School Admin',
    });

    const { getByTestId, queryByTestId } = render(<MainTabs />);
    expect(getByTestId('company-admin-tabs')).toBeTruthy();
    // A school administrator must never land on the platform admin surface.
    expect(queryByTestId('admin-tabs')).toBeNull();
  });

  it('renders student tabs for student role', () => {
    mockedUseAuthActions.mockReturnValue({
      userRole: 'student',
      onLogout: jest.fn(),
      userName: 'Student',
    });

    const { getByTestId } = render(<MainTabs />);
    expect(getByTestId('student-tabs')).toBeTruthy();
  });

  it('shows guard and allows logout for unknown role', () => {
    const onLogout = jest.fn();
    mockedUseAuthActions.mockReturnValue({
      userRole: 'school_owner',
      onLogout,
      userName: 'Owner',
    });

    const { getByText, queryByTestId } = render(<MainTabs />);

    expect(queryByTestId('student-tabs')).toBeNull();
    expect(getByText('Unsupported account role')).toBeTruthy();

    fireEvent.press(getByText('Return to login'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
