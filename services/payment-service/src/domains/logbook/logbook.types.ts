import { SupportedCurrency } from '@eliteepay/shared';

export interface LogbookEntry {
  id: string;
  userId: string;
  type: LogbookEntryType;
  amountMinor: number;
  currency: SupportedCurrency;
  note?: string | undefined;
  photoUrl?: string | undefined;
  location?: LogbookLocation | undefined;
  isReconciled: boolean;
  reconciledTransactionId?: string | undefined;
  clientId?: string | undefined; // For offline sync
  createdAt: string;
  updatedAt: string;
}

export type LogbookEntryType = 'fuel' | 'cash' | 'misc';

export interface LogbookLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface CreateLogbookEntryRequest {
  type: LogbookEntryType;
  amount: number;
  currency: SupportedCurrency;
  note?: string;
  photo?: Express.Multer.File | undefined;
  location?: LogbookLocation;
  clientId?: string; // For offline sync
}

export interface LogbookEntryQuery {
  page?: number;
  limit?: number;
  type?: LogbookEntryType;
  currency?: SupportedCurrency;
  startDate?: string;
  endDate?: string;
  isReconciled?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OfflineSyncRequest {
  entries: Array<CreateLogbookEntryRequest & {
    clientId: string;
    createdAt: string; // Client-side timestamp
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

export interface ReconciliationMatch {
  logbookEntryId: string;
  transactionId: string;
  matchScore: number;
  matchType: 'automatic' | 'manual';
  matchedAt: string;
}

export interface ReconciliationCandidate {
  transactionId: string;
  reference: string;
  amount: number;
  currency: SupportedCurrency;
  createdAt: string;
  matchScore: number;
  timeDifference: number; // in minutes
  amountDifference: number;
}

// Database mapping types
export interface DatabaseLogbookEntry {
  id: string;
  user_id: string;
  type: LogbookEntryType;
  amount_minor: number;
  currency: SupportedCurrency;
  note?: string | undefined;
  photo_url?: string | undefined;
  location?: LogbookLocation | undefined;
  is_reconciled: boolean;
  reconciled_transaction_id?: string | undefined;
  client_id?: string | undefined;
  created_at: string;
  updated_at: string;
}
