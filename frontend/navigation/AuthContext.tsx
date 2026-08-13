/**
 * Auth actions context — shared with nested tab/stack navigators
 * so they can access logout, userName, and userRole without prop-drilling.
 */
import React, { createContext, useContext } from 'react';

export interface AuthActions {
  onLogout: () => void;
  userName: string;
  userRole: string | null;
  /** The school a company administrator acts for; null for every other role. */
  companyName: string | null;
}

export const AuthActionsContext = createContext<AuthActions>({
  onLogout: () => {},
  userName: '',
  userRole: null,
  companyName: null,
});

export function useAuthActions(): AuthActions {
  return useContext(AuthActionsContext);
}
