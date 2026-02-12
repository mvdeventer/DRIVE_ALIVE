/**
 * Auth actions context — shared with nested tab/stack navigators
 * so they can access logout, userName, and userRole without prop-drilling.
 */
import React, { createContext, useContext } from 'react';

export interface AuthActions {
  onLogout: () => void;
  userName: string;
  userRole: string | null;
}

export const AuthActionsContext = createContext<AuthActions>({
  onLogout: () => {},
  userName: '',
  userRole: null,
});

export function useAuthActions(): AuthActions {
  return useContext(AuthActionsContext);
}
