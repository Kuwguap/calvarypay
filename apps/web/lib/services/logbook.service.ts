/**
 * Enhanced Logbook Service for CalvaryPay
 * Handles digital logbook entries, offline sync, photo uploads, and enhanced security
 */

import { apiClient, PaginationResult } from '../api';
import { z } from 'zod';
import { supabaseService } from '@/lib/supabase';
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service';

export interface LogbookEntry {
  id: string;
  type: 'fuel' | 'cash' | 'misc';
  amount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD';
  note?: string;
  photoUrl?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  isReconciled: boolean;
  reconciledTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogbookEntryRequest {
  type: 'fuel' | 'cash' | 'misc';
  amount: number;
  currency: 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD';
  note?: string;
  photo?: File;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  clientId?: string; // For offline sync
}

export interface LogbookEntryQuery {
  page?: number;
  limit?: number;
  type?: 'fuel' | 'cash' | 'misc';
  currency?: string;
  startDate?: string;
  endDate?: string;
  isReconciled?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OfflineSyncRequest {
  entries: Array<CreateLogbookEntryRequest & {
    clientId: string;
    createdAt: string;
  }>;
}

export interface SyncResult {
  clientId: string;
  status: 'synced' | 'duplicate' | 'failed';
  serverId?: string;
  error?: string;
}

export interface OfflineSyncResponse {
  syncResults: SyncResult[];
  totalProcessed: number;
  correlationId: string;
}

export interface LogbookStats {
  totalEntries: number;
  totalAmount: number;
  entriesByType: Record<string, number>;
  entriesByCurrency: Record<string, number>;
  reconciledEntries: number;
  unreconciledEntries: number;
}

export class LogbookService {
  /**
   * Create a new logbook entry
   */
  async createEntry(request: CreateLogbookEntryRequest): Promise<LogbookEntry> {
    if (request.photo) {
      // Use file upload method for entries with photos
      return apiClient.uploadFile<LogbookEntry>('/logbook/entries', request.photo, {
        type: request.type,
        amount: request.amount,
        currency: request.currency,
        note: request.note,
        location: request.location,
        clientId: request.clientId,
      });
    } else {
      // Use regular POST for entries without photos
      return apiClient.post<LogbookEntry>('/logbook/entries', request);
    }
  }

  /**
   * Get user logbook entries with pagination and filtering
   */
  async getEntries(query?: LogbookEntryQuery): Promise<PaginationResult<LogbookEntry>> {
    const params = new URLSearchParams();
    
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.type) params.append('type', query.type);
    if (query?.currency) params.append('currency', query.currency);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.isReconciled !== undefined) params.append('isReconciled', query.isReconciled.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `/logbook/entries?${queryString}` : '/logbook/entries';

    return apiClient.get<PaginationResult<LogbookEntry>>(url);
  }

  /**
   * Get logbook entry by ID
   */
  async getEntry(entryId: string): Promise<LogbookEntry> {
    return apiClient.get<LogbookEntry>(`/logbook/entries/${entryId}`);
  }

  /**
   * Update logbook entry
   */
  async updateEntry(entryId: string, updates: Partial<CreateLogbookEntryRequest>): Promise<LogbookEntry> {
    return apiClient.put<LogbookEntry>(`/logbook/entries/${entryId}`, updates);
  }

  /**
   * Delete logbook entry
   */
  async deleteEntry(entryId: string): Promise<void> {
    return apiClient.delete<void>(`/logbook/entries/${entryId}`);
  }

  /**
   * Sync offline entries
   */
  async syncOfflineEntries(request: OfflineSyncRequest): Promise<OfflineSyncResponse> {
    return apiClient.post<OfflineSyncResponse>('/logbook/sync', request);
  }

  /**
   * Get logbook statistics
   */
  async getStats(
    startDate?: string,
    endDate?: string,
    currency?: string
  ): Promise<LogbookStats> {
    const params = new URLSearchParams();
    
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (currency) params.append('currency', currency);

    const queryString = params.toString();
    const url = queryString ? `/logbook/stats?${queryString}` : '/logbook/stats';

    return apiClient.get<LogbookStats>(url);
  }

  /**
   * Export logbook entries to CSV
   */
  async exportEntries(query?: LogbookEntryQuery): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (query?.type) params.append('type', query.type);
    if (query?.currency) params.append('currency', query.currency);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.isReconciled !== undefined) params.append('isReconciled', query.isReconciled.toString());

    const queryString = params.toString();
    const url = queryString ? `/logbook/export?${queryString}` : '/logbook/export';

    return apiClient.get<Blob>(url, {
      responseType: 'blob',
    } as any);
  }

  /**
   * Get unreconciled entries
   */
  async getUnreconciledEntries(): Promise<LogbookEntry[]> {
    return apiClient.get<LogbookEntry[]>('/logbook/entries/unreconciled');
  }

  /**
   * Mark entry as reconciled
   */
  async markAsReconciled(entryId: string, transactionId: string): Promise<LogbookEntry> {
    return apiClient.post<LogbookEntry>(`/logbook/entries/${entryId}/reconcile`, {
      transactionId,
    });
  }

  /**
   * Upload photo for existing entry
   */
  async uploadPhoto(entryId: string, photo: File): Promise<LogbookEntry> {
    return apiClient.uploadFile<LogbookEntry>(`/logbook/entries/${entryId}/photo`, photo);
  }

  /**
   * Delete photo from entry
   */
  async deletePhoto(entryId: string): Promise<LogbookEntry> {
    return apiClient.delete<LogbookEntry>(`/logbook/entries/${entryId}/photo`);
  }

  /**
   * Get entry types
   */
  getEntryTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'fuel', label: 'Fuel' },
      { value: 'cash', label: 'Cash' },
      { value: 'misc', label: 'Miscellaneous' },
    ];
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Array<{ value: string; label: string }> {
    return [
      { value: 'NGN', label: 'Nigerian Naira (₦)' },
      { value: 'KES', label: 'Kenyan Shilling (KSh)' },
      { value: 'GHS', label: 'Ghanaian Cedi (₵)' },
      { value: 'ZAR', label: 'South African Rand (R)' },
      { value: 'USD', label: 'US Dollar ($)' },
    ];
  }

  /**
   * Format currency amount
   */
  formatAmount(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
      NGN: '₦',
      KES: 'KSh',
      GHS: '₵',
      ZAR: 'R',
      USD: '$',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }

  /**
   * Validate entry data
   */
  validateEntry(entry: CreateLogbookEntryRequest): string[] {
    const errors: string[] = [];

    if (!entry.type) {
      errors.push('Entry type is required');
    }

    if (!entry.amount || entry.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (entry.amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000');
    }

    if (!entry.currency) {
      errors.push('Currency is required');
    }

    if (entry.note && entry.note.length > 500) {
      errors.push('Note cannot exceed 500 characters');
    }

    if (entry.location) {
      if (typeof entry.location.lat !== 'number' || 
          entry.location.lat < -90 || entry.location.lat > 90) {
        errors.push('Invalid latitude');
      }

      if (typeof entry.location.lng !== 'number' || 
          entry.location.lng < -180 || entry.location.lng > 180) {
        errors.push('Invalid longitude');
      }
    }

    return errors;
  }
}

// Export singleton instance
export const logbookService = new LogbookService();
