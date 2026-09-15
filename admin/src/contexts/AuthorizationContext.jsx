import { createContext, useContext, useMemo } from 'react';
import {
  hasAnyPermission,
  hasPermission,
  isSuperAdmin,
} from '../utils/accessControl';

const AuthorizationContext = createContext(null);

export const AuthorizationProvider = ({ user, children }) => {
  const value = useMemo(() => ({
    user,
    isSuperAdmin: isSuperAdmin(user),
    can: (permission) => hasPermission(user, permission),
    canAny: (permissions) => hasAnyPermission(user, permissions),
  }), [user]);

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
};

export const useAuthorization = () => {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within AuthorizationProvider');
  }
  return context;
};

