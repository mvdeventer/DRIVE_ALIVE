/**
 * Role-based tab navigator switcher.
 * Reads the current user role from AuthContext and renders the
 * appropriate bottom-tab navigator.
 */
import React from 'react';

import { useAuthActions } from './AuthContext';
import AdminTabs from './AdminTabs';
import InstructorTabs from './InstructorTabs';
import StudentTabs from './StudentTabs';

export default function MainTabs() {
  const { userRole } = useAuthActions();

  if (userRole === 'admin') return <AdminTabs />;
  if (userRole === 'instructor') return <InstructorTabs />;
  return <StudentTabs />;
}
