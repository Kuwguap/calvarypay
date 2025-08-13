/**
 * Authentication Store
 * Global state management for user authentication
 */

import { atom } from 'jotai';

// Define User interface locally to avoid circular dependencies
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'merchant' | 'employee' | 'customer';
  isActive: boolean;
}

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Main auth store atom (no localStorage to avoid SSR issues)
export const authStore = atom<AuthState>({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true
  error: null
});

// User atom derived from auth store
export const userAtom = atom(
  (get) => get(authStore).user,
  (get, set, user: User | null) => {
    const currentState = get(authStore);
    set(authStore, {
      ...currentState,
      user,
      isAuthenticated: user !== null && user.isActive
    });
  }
);

// Authentication status atom
export const isAuthenticatedAtom = atom((get) => {
  return get(authStore).isAuthenticated;
});

// User role atoms
export const userRoleAtom = atom((get) => {
  const user = get(userAtom);
  return user?.role || null;
});

export const isAdminAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin';
});

export const isMerchantAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'merchant';
});

export const isCustomerAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'customer';
});

export const isEmployeeAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'employee';
});

// Loading states
export const authLoadingAtom = atom(
  (get) => get(authStore).isLoading,
  (get, set, loading: boolean) => {
    const currentState = get(authStore);
    set(authStore, { ...currentState, isLoading: loading });
  }
);

export const loginLoadingAtom = atom(false);
export const registerLoadingAtom = atom(false);

// Error states
export const authErrorAtom = atom(
  (get) => get(authStore).error,
  (get, set, error: string | null) => {
    const currentState = get(authStore);
    set(authStore, { ...currentState, error });
  }
);

// Actions
export const setUserAtom = atom(
  null,
  (get, set, user: User | null) => {
    const currentState = get(authStore);
    set(authStore, {
      ...currentState,
      user,
      isAuthenticated: user !== null && user.isActive,
      error: null
    });
  }
);

export const setAuthLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(authLoadingAtom, loading);
  }
);

export const setLoginLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(loginLoadingAtom, loading);
  }
);

export const setRegisterLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(registerLoadingAtom, loading);
  }
);

export const setAuthErrorAtom = atom(
  null,
  (get, set, error: string | null) => {
    set(authErrorAtom, error);
  }
);

export const clearAuthAtom = atom(
  null,
  (get, set) => {
    set(authStore, {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
    set(loginLoadingAtom, false);
    set(registerLoadingAtom, false);
  }
);

// Computed atoms
export const userDisplayNameAtom = atom((get) => {
  const user = get(userAtom);
  if (!user) return '';
  return `${user.firstName} ${user.lastName}`;
});

export const userInitialsAtom = atom((get) => {
  const user = get(userAtom);
  if (!user) return '';
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
});

export const dashboardRouteAtom = atom((get) => {
  const role = get(userRoleAtom);
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'merchant':
      return '/dashboard/company';
    case 'employee':
      return '/dashboard/employee';
    case 'customer':
      return '/dashboard/customer';
    default:
      // Default to customer dashboard if no role is specified
      return '/dashboard/customer';
  }
});

// Permission atoms
export const canAccessAdminAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin';
});

export const canAccessMerchantAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin' || role === 'merchant';
});

export const canAccessEmployeeAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin' || role === 'merchant' || role === 'employee';
});

export const canManageUsersAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin';
});

export const canManagePaymentsAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin' || role === 'merchant';
});

export const canViewReportsAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin' || role === 'merchant';
});

export const canManagePricingAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin';
});

export const canAccessReconciliationAtom = atom((get) => {
  const role = get(userRoleAtom);
  return role === 'admin';
});
