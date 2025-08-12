/**
 * Application Store
 * Global state management for app-wide state
 */

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Theme and UI state
export const themeAtom = atomWithStorage<'light' | 'dark' | 'system'>('eliteepay_theme', 'system');
export const sidebarOpenAtom = atomWithStorage('eliteepay_sidebar_open', true);
export const sidebarCollapsedAtom = atomWithStorage('eliteepay_sidebar_collapsed', false);

// Network and connectivity
export const isOnlineAtom = atom(true);
export const isOfflineModeAtom = atom(false);

// Loading states
export const globalLoadingAtom = atom(false);
export const pageLoadingAtom = atom(false);

// Notification state
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const notificationsAtom = atom<Notification[]>([]);

// Modal state
export interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
  options?: {
    closable?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    centered?: boolean;
  };
}

export const modalsAtom = atom<Modal[]>([]);

// Search state
export const globalSearchAtom = atom('');
export const searchResultsAtom = atom<any[]>([]);
export const searchLoadingAtom = atom(false);

// Sync state
export const lastSyncAtom = atomWithStorage<string | null>('eliteepay_last_sync', null);
export const syncInProgressAtom = atom(false);
export const pendingSyncCountAtom = atom(0);

// Feature flags
export const featureFlagsAtom = atom({
  offlineMode: true,
  realtimeUpdates: true,
  analytics: false,
  betaFeatures: false,
});

// Actions
export const addNotificationAtom = atom(
  null,
  (get, set, notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000,
    };
    
    const current = get(notificationsAtom);
    set(notificationsAtom, [...current, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        set(removeNotificationAtom, id);
      }, newNotification.duration);
    }
  }
);

export const removeNotificationAtom = atom(
  null,
  (get, set, id: string) => {
    const current = get(notificationsAtom);
    set(notificationsAtom, current.filter(n => n.id !== id));
  }
);

export const clearNotificationsAtom = atom(
  null,
  (get, set) => {
    set(notificationsAtom, []);
  }
);

export const openModalAtom = atom(
  null,
  (get, set, modal: Omit<Modal, 'id'>) => {
    const id = Date.now().toString();
    const newModal: Modal = { ...modal, id };
    
    const current = get(modalsAtom);
    set(modalsAtom, [...current, newModal]);
  }
);

export const closeModalAtom = atom(
  null,
  (get, set, id: string) => {
    const current = get(modalsAtom);
    set(modalsAtom, current.filter(m => m.id !== id));
  }
);

export const closeAllModalsAtom = atom(
  null,
  (get, set) => {
    set(modalsAtom, []);
  }
);

export const setGlobalLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(globalLoadingAtom, loading);
  }
);

export const setPageLoadingAtom = atom(
  null,
  (get, set, loading: boolean) => {
    set(pageLoadingAtom, loading);
  }
);

export const setIsOnlineAtom = atom(
  null,
  (get, set, online: boolean) => {
    set(isOnlineAtom, online);
  }
);

export const setOfflineModeAtom = atom(
  null,
  (get, set, offline: boolean) => {
    set(isOfflineModeAtom, offline);
  }
);

export const setSyncInProgressAtom = atom(
  null,
  (get, set, syncing: boolean) => {
    set(syncInProgressAtom, syncing);
  }
);

export const setPendingSyncCountAtom = atom(
  null,
  (get, set, count: number) => {
    set(pendingSyncCountAtom, count);
  }
);

export const setLastSyncAtom = atom(
  null,
  (get, set, timestamp: string) => {
    set(lastSyncAtom, timestamp);
  }
);

export const toggleSidebarAtom = atom(
  null,
  (get, set) => {
    const current = get(sidebarOpenAtom);
    set(sidebarOpenAtom, !current);
  }
);

export const toggleSidebarCollapsedAtom = atom(
  null,
  (get, set) => {
    const current = get(sidebarCollapsedAtom);
    set(sidebarCollapsedAtom, !current);
  }
);

// Computed atoms
export const hasNotificationsAtom = atom((get) => {
  const notifications = get(notificationsAtom);
  return notifications.length > 0;
});

export const hasModalsAtom = atom((get) => {
  const modals = get(modalsAtom);
  return modals.length > 0;
});

export const isLoadingAtom = atom((get) => {
  const globalLoading = get(globalLoadingAtom);
  const pageLoading = get(pageLoadingAtom);
  return globalLoading || pageLoading;
});

export const syncStatusAtom = atom((get) => {
  const inProgress = get(syncInProgressAtom);
  const pendingCount = get(pendingSyncCountAtom);
  const lastSync = get(lastSyncAtom);
  
  if (inProgress) return 'syncing';
  if (pendingCount > 0) return 'pending';
  if (lastSync) return 'synced';
  return 'idle';
});

export const connectionStatusAtom = atom((get) => {
  const isOnline = get(isOnlineAtom);
  const isOfflineMode = get(isOfflineModeAtom);
  
  if (isOfflineMode) return 'offline';
  if (isOnline) return 'online';
  return 'disconnected';
});

// Utility actions
export const showSuccessNotificationAtom = atom(
  null,
  (get, set, message: string, title?: string) => {
    set(addNotificationAtom, {
      type: 'success',
      title: title || 'Success',
      message,
    });
  }
);

export const showErrorNotificationAtom = atom(
  null,
  (get, set, message: string, title?: string) => {
    set(addNotificationAtom, {
      type: 'error',
      title: title || 'Error',
      message,
      duration: 8000, // Longer duration for errors
    });
  }
);

export const showWarningNotificationAtom = atom(
  null,
  (get, set, message: string, title?: string) => {
    set(addNotificationAtom, {
      type: 'warning',
      title: title || 'Warning',
      message,
    });
  }
);

export const showInfoNotificationAtom = atom(
  null,
  (get, set, message: string, title?: string) => {
    set(addNotificationAtom, {
      type: 'info',
      title: title || 'Info',
      message,
    });
  }
);
