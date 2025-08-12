/**
 * Authentication Store
 * Global state management for user authentication
 */

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { User } from '../services/auth.service';

// User atom with localStorage persistence
export const userAtom = atomWithStorage<User | null>('eliteepay_user', null);

// Authentication status atom
export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom);
  return user !== null && user.isActive;
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
export const authLoadingAtom = atom(false);
export const loginLoadingAtom = atom(false);
export const registerLoadingAtom = atom(false);

// Error states
export const authErrorAtom = atom<string | null>(null);

// Actions
export const setUserAtom = atom(
  null,
  (get, set, user: User | null) => {
    set(userAtom, user);
    set(authErrorAtom, null);
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
    set(userAtom, null);
    set(authErrorAtom, null);
    set(authLoadingAtom, false);
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
