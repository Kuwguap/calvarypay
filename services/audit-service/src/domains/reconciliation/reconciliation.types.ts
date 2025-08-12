import { SupportedCurrency } from '@eliteepay/shared';

export interface ReconciliationMatch {
  id: string;
  logbookEntryId: string;
  transactionId: string;
  userId: string;
  matchScore: number;
  matchType: 'automatic' | 'manual';
  matchCriteria: {
    amountMatch: boolean;
    timeMatch: boolean;
    currencyMatch: boolean;
    userMatch: boolean;
  };
  timeDifferenceMinutes: number;
  amountDifferenceMinor: number;
  matchedAt: string;
  matchedBy?: string | undefined;
  notes?: string | undefined;
}

export interface ReconciliationCandidate {
  transactionId: string;
  logbookEntryId: string;
  userId: string;
  transactionAmount: number;
  logbookAmount: number;
  currency: SupportedCurrency;
  transactionDate: string;
  logbookDate: string;
  matchScore: number;
  timeDifferenceMinutes: number;
  amountDifferenceMinor: number;
  reasons: string[];
}

export interface ReconciliationReport {
  id: string;
  reportDate: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTransactions: number;
    totalLogbookEntries: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    unmatchedLogbookEntries: number;
    matchRate: number; // percentage
  };
  matches: ReconciliationMatch[];
  unmatchedTransactions: UnmatchedTransaction[];
  unmatchedLogbookEntries: UnmatchedLogbookEntry[];
  generatedAt: string;
  generatedBy: string;
  correlationId: string;
}

export interface UnmatchedTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: SupportedCurrency;
  reference: string;
  status: string;
  createdAt: string;
  possibleMatches: ReconciliationCandidate[];
}

export interface UnmatchedLogbookEntry {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: SupportedCurrency;
  note?: string;
  createdAt: string;
  possibleMatches: ReconciliationCandidate[];
}

export interface ReconciliationConfig {
  timeWindowMinutes: number; // Default: 10 minutes
  amountTolerancePercent: number; // Default: 0% (exact match)
  minimumMatchScore: number; // Default: 0.8 (80%)
  autoMatchThreshold: number; // Default: 0.95 (95%)
}

export interface ReconciliationQuery {
  startDate: string;
  endDate: string;
  userId?: string;
  currency?: SupportedCurrency;
  matchType?: 'automatic' | 'manual' | 'unmatched';
  minMatchScore?: number;
}

export interface ManualMatchRequest {
  transactionId: string;
  logbookEntryId: string;
  notes?: string;
}

export interface ReconciliationStats {
  totalReports: number;
  averageMatchRate: number;
  lastReportDate: string;
  pendingReconciliations: number;
  topUnmatchedReasons: Array<{
    reason: string;
    count: number;
  }>;
}

export interface ReconciliationMetrics {
  matchRate: number;
  averageMatchScore: number;
  averageTimeDifference: number;
  totalMatches: number;
  automaticMatches: number;
  manualMatches: number;
}

// Database mapping types
export interface DatabaseReconciliationMatch {
  id: string;
  logbook_entry_id: string;
  transaction_id: string;
  user_id: string;
  match_score: number;
  match_type: 'automatic' | 'manual';
  match_criteria: any; // JSONB
  time_difference_minutes: number;
  amount_difference_minor: number;
  matched_at: string;
  matched_by?: string;
  notes?: string;
}

export interface DatabaseReconciliationReport {
  id: string;
  report_date: string;
  date_range: any; // JSONB
  summary: any; // JSONB
  matches: any; // JSONB
  unmatched_transactions: any; // JSONB
  unmatched_logbook_entries: any; // JSONB
  generated_at: string;
  generated_by: string;
  correlation_id: string;
}
