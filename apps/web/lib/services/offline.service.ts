/**
 * Offline Service
 * Handles offline data storage, sync, and PWA capabilities
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { CreateLogbookEntryRequest, LogbookEntry, logbookService } from './logbook.service';

// Database Schema
interface OfflineDB extends DBSchema {
  logbook_entries: {
    key: string;
    value: OfflineLogbookEntry;
    indexes: {
      'by-sync-status': string;
      'by-created-at': string;
      'by-type': string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-created-at': string;
    };
  };
  app_state: {
    key: string;
    value: any;
  };
}

interface OfflineLogbookEntry extends CreateLogbookEntryRequest {
  id: string;
  clientId: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  serverId?: string;
  createdAt: string;
  updatedAt: string;
  photoBlob?: Blob; // Store photo as blob for offline access
}

interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'logbook_entry';
  entityId: string;
  data: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}

export class OfflineService {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private syncInProgress = false;

  /**
   * Initialize the offline database
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.db = await openDB<OfflineDB>(config.offline.dbName, config.offline.dbVersion, {
      upgrade(db) {
        // Logbook entries store
        if (!db.objectStoreNames.contains('logbook_entries')) {
          const logbookStore = db.createObjectStore('logbook_entries', {
            keyPath: 'id',
          });
          logbookStore.createIndex('by-sync-status', 'syncStatus');
          logbookStore.createIndex('by-created-at', 'createdAt');
          logbookStore.createIndex('by-type', 'type');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
          });
          syncStore.createIndex('by-status', 'status');
          syncStore.createIndex('by-created-at', 'createdAt');
        }

        // App state store
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', {
            keyPath: 'key',
          });
        }
      },
    });
  }

  /**
   * Check if offline mode is available
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && this.db !== null;
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return typeof window !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Store logbook entry offline
   */
  async storeLogbookEntry(entry: CreateLogbookEntryRequest): Promise<OfflineLogbookEntry> {
    if (!this.db) throw new Error('Offline database not initialized');

    const clientId = uuidv4();
    const now = new Date().toISOString();

    const offlineEntry: OfflineLogbookEntry = {
      ...entry,
      id: clientId,
      clientId,
      syncStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    // Store photo as blob if provided
    if (entry.photo) {
      offlineEntry.photoBlob = entry.photo;
      // Remove the File object to avoid serialization issues
      delete offlineEntry.photo;
    }

    await this.db.put('logbook_entries', offlineEntry);

    // Add to sync queue
    await this.addToSyncQueue('create', 'logbook_entry', clientId, offlineEntry);

    return offlineEntry;
  }

  /**
   * Get offline logbook entries
   */
  async getOfflineLogbookEntries(): Promise<OfflineLogbookEntry[]> {
    if (!this.db) return [];

    return this.db.getAll('logbook_entries');
  }

  /**
   * Get pending sync items
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];

    return this.db.getAllFromIndex('sync_queue', 'by-status', 'pending');
  }

  /**
   * Add item to sync queue
   */
  private async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    entityType: 'logbook_entry',
    entityId: string,
    data: any
  ): Promise<void> {
    if (!this.db) return;

    const syncItem: SyncQueueItem = {
      id: uuidv4(),
      type,
      entityType,
      entityId,
      data,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    await this.db.put('sync_queue', syncItem);
  }

  /**
   * Sync offline data with server
   */
  async syncWithServer(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    if (!this.db || this.syncInProgress || !this.isOnline()) {
      return { synced: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
      const pendingItems = await this.getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          synced++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to sync ${item.entityType} ${item.entityId}: ${errorMessage}`);
          
          // Update retry count
          item.retryCount++;
          item.lastAttempt = new Date().toISOString();
          item.error = errorMessage;
          
          if (item.retryCount >= config.offline.maxRetries) {
            item.status = 'failed';
          }
          
          await this.db!.put('sync_queue', item);
        }
      }
    } finally {
      this.syncInProgress = false;
    }

    return { synced, failed, errors };
  }

  /**
   * Sync individual item
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;

    // Update status to syncing
    item.status = 'syncing';
    await this.db.put('sync_queue', item);

    if (item.entityType === 'logbook_entry' && item.type === 'create') {
      const offlineEntry = item.data as OfflineLogbookEntry;
      
      // Prepare request data
      const requestData: CreateLogbookEntryRequest = {
        type: offlineEntry.type,
        amount: offlineEntry.amount,
        currency: offlineEntry.currency,
        note: offlineEntry.note,
        location: offlineEntry.location,
        clientId: offlineEntry.clientId,
      };

      // Add photo if available
      if (offlineEntry.photoBlob) {
        requestData.photo = new File([offlineEntry.photoBlob], 'photo.jpg', {
          type: offlineEntry.photoBlob.type,
        });
      }

      // Sync with server
      const syncedEntry = await logbookService.createEntry(requestData);

      // Update offline entry with server ID
      offlineEntry.serverId = syncedEntry.id;
      offlineEntry.syncStatus = 'synced';
      await this.db.put('logbook_entries', offlineEntry);

      // Mark sync item as completed
      item.status = 'completed';
      await this.db.put('sync_queue', item);
    }
  }

  /**
   * Clear synced data
   */
  async clearSyncedData(): Promise<void> {
    if (!this.db) return;

    // Remove synced logbook entries
    const syncedEntries = await this.db.getAllFromIndex('logbook_entries', 'by-sync-status', 'synced');
    for (const entry of syncedEntries) {
      await this.db.delete('logbook_entries', entry.id);
    }

    // Remove completed sync items
    const completedItems = await this.db.getAllFromIndex('sync_queue', 'by-status', 'completed');
    for (const item of completedItems) {
      await this.db.delete('sync_queue', item.id);
    }
  }

  /**
   * Get app state
   */
  async getAppState(key: string): Promise<any> {
    if (!this.db) return null;

    const result = await this.db.get('app_state', key);
    return result?.value || null;
  }

  /**
   * Set app state
   */
  async setAppState(key: string, value: any): Promise<void> {
    if (!this.db) return;

    await this.db.put('app_state', { key, value });
  }

  /**
   * Clear all offline data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    await this.db.clear('logbook_entries');
    await this.db.clear('sync_queue');
    await this.db.clear('app_state');
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    logbookEntries: number;
    syncQueue: number;
    totalSize: number;
  }> {
    if (!this.db) return { logbookEntries: 0, syncQueue: 0, totalSize: 0 };

    const logbookEntries = await this.db.count('logbook_entries');
    const syncQueue = await this.db.count('sync_queue');

    // Estimate total size (rough calculation)
    const totalSize = (logbookEntries * 1024) + (syncQueue * 512); // Rough estimate in bytes

    return { logbookEntries, syncQueue, totalSize };
  }

  /**
   * Start automatic sync
   */
  startAutoSync(): void {
    if (typeof window === 'undefined') return;

    // Sync when coming online
    window.addEventListener('online', () => {
      this.syncWithServer();
    });

    // Periodic sync
    setInterval(() => {
      if (this.isOnline()) {
        this.syncWithServer();
      }
    }, config.offline.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.syncWithServer);
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
