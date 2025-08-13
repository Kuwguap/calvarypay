import { v4 as uuidv4 } from 'uuid';
import { 
  supabaseService, 
  logger, 
  AppError, 
  HttpStatusCode,
  Transaction
} from '@CalvaryPay/shared';
import { 
  ReconciliationMatch,
  ReconciliationCandidate,
  ReconciliationReport,
  ReconciliationConfig,
  ReconciliationQuery,
  ManualMatchRequest,
  UnmatchedTransaction,
  UnmatchedLogbookEntry,
  ReconciliationMetrics,
  DatabaseReconciliationMatch,
  DatabaseReconciliationReport
} from './reconciliation.types';

export class ReconciliationService {
  private readonly matchesTable = 'reconciliation_matches';
  private readonly reportsTable = 'reconciliation_reports';
  
  private readonly defaultConfig: ReconciliationConfig = {
    timeWindowMinutes: 10,
    amountTolerancePercent: 0,
    minimumMatchScore: 0.8,
    autoMatchThreshold: 0.95
  };

  async runReconciliation(
    startDate: string,
    endDate: string,
    userId?: string,
    config?: Partial<ReconciliationConfig>
  ): Promise<ReconciliationReport> {
    try {
      // Validate required parameters
      if (!startDate || !endDate) {
        throw new AppError(
          'Start date and end date are required',
          HttpStatusCode.BAD_REQUEST,
          'MISSING_DATE_RANGE'
        );
      }

      const reconciliationConfig = { ...this.defaultConfig, ...config };
      const reportId = uuidv4();
      const correlationId = uuidv4();
      const now = new Date().toISOString();

      logger.info('Starting reconciliation process', {
        reportId,
        startDate,
        endDate,
        userId: userId || 'all',
        correlationId
      });

      // Fetch transactions and logbook entries
      const [transactions, logbookEntries] = await Promise.all([
        this.getTransactionsForReconciliation(startDate, endDate, userId),
        this.getLogbookEntriesForReconciliation(startDate, endDate, userId)
      ]);

      logger.info('Data fetched for reconciliation', {
        transactionCount: transactions.length,
        logbookEntryCount: logbookEntries.length,
        correlationId
      });

      // Find matches
      const candidates = this.findReconciliationCandidates(
        transactions, 
        logbookEntries, 
        reconciliationConfig
      );

      // Process automatic matches
      const automaticMatches = candidates
        .filter(c => c.matchScore >= reconciliationConfig.autoMatchThreshold)
        .map(c => this.createMatchFromCandidate(c, 'automatic', correlationId));

      // Store automatic matches
      if (automaticMatches.length > 0) {
        await this.storeMatches(automaticMatches);
      }

      // Identify unmatched items
      const matchedTransactionIds = new Set(automaticMatches.map(m => m.transactionId));
      const matchedLogbookIds = new Set(automaticMatches.map(m => m.logbookEntryId));

      const unmatchedTransactions = transactions
        .filter(t => !matchedTransactionIds.has(t.id))
        .map(t => this.createUnmatchedTransaction(t, candidates));

      const unmatchedLogbookEntries = logbookEntries
        .filter(l => !matchedLogbookIds.has(l.id))
        .map(l => this.createUnmatchedLogbookEntry(l, candidates));

      // Generate report
      const report: ReconciliationReport = {
        id: reportId,
        // @ts-ignore - We've validated these parameters are not undefined
        reportDate: startDate.split('T')[0],
        // @ts-ignore - We've validated these parameters are not undefined
        dateRange: { startDate, endDate },
        summary: {
          totalTransactions: transactions.length,
          totalLogbookEntries: logbookEntries.length,
          matchedTransactions: automaticMatches.length,
          unmatchedTransactions: unmatchedTransactions.length,
          unmatchedLogbookEntries: unmatchedLogbookEntries.length,
          matchRate: transactions.length > 0 
            ? (automaticMatches.length / transactions.length) * 100 
            : 0
        },
        matches: automaticMatches,
        unmatchedTransactions,
        unmatchedLogbookEntries,
        generatedAt: now,
        generatedBy: userId || 'system',
        correlationId
      };

      // Store report
      await this.storeReconciliationReport(report);

      logger.info('Reconciliation completed successfully', {
        reportId,
        matchedCount: automaticMatches.length,
        unmatchedTransactions: unmatchedTransactions.length,
        unmatchedLogbookEntries: unmatchedLogbookEntries.length,
        matchRate: report.summary.matchRate,
        correlationId
      });

      return report;

    } catch (error) {
      logger.error('Reconciliation process failed', {
        startDate,
        endDate,
        userId: userId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to run reconciliation',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'RECONCILIATION_ERROR'
      );
    }
  }

  async createManualMatch(
    request: ManualMatchRequest, 
    matchedBy: string
  ): Promise<ReconciliationMatch> {
    try {
      // Validate that both transaction and logbook entry exist
      const [transaction, logbookEntry] = await Promise.all([
        this.getTransactionById(request.transactionId),
        this.getLogbookEntryById(request.logbookEntryId)
      ]);

      if (!transaction || !logbookEntry) {
        throw new AppError(
          'Transaction or logbook entry not found',
          HttpStatusCode.NOT_FOUND,
          'MATCH_ITEMS_NOT_FOUND'
        );
      }

      // Check if either item is already matched
      const existingMatch = await this.findExistingMatch(
        request.transactionId, 
        request.logbookEntryId
      );

      if (existingMatch) {
        throw new AppError(
          'Items are already matched',
          HttpStatusCode.CONFLICT,
          'ITEMS_ALREADY_MATCHED'
        );
      }

      // Calculate match metrics
      const timeDiff = Math.abs(
        new Date(transaction.createdAt).getTime() - 
        new Date(logbookEntry.createdAt).getTime()
      ) / (1000 * 60); // minutes

      const amountDiff = Math.abs(transaction.amount - logbookEntry.amountMinor);

      const match: ReconciliationMatch = {
        id: uuidv4(),
        logbookEntryId: request.logbookEntryId,
        transactionId: request.transactionId,
        userId: transaction.userId,
        matchScore: 1.0, // Manual matches get perfect score
        matchType: 'manual',
        matchCriteria: {
          amountMatch: amountDiff === 0,
          timeMatch: timeDiff <= 10,
          currencyMatch: transaction.currency === logbookEntry.currency,
          userMatch: transaction.userId === logbookEntry.userId
        },
        timeDifferenceMinutes: timeDiff,
        amountDifferenceMinor: amountDiff,
        matchedAt: new Date().toISOString(),
        matchedBy,
        notes: request.notes || undefined
      };

      // Store the match
      await this.storeMatches([match]);

      logger.info('Manual match created successfully', {
        matchId: match.id,
        transactionId: request.transactionId,
        logbookEntryId: request.logbookEntryId,
        matchedBy
      });

      return match;

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Create manual match failed', {
        transactionId: request.transactionId,
        logbookEntryId: request.logbookEntryId,
        matchedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create manual match',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_MANUAL_MATCH_ERROR'
      );
    }
  }

  async getReconciliationReport(reportId: string): Promise<ReconciliationReport | null> {
    try {
      const { data, error } = await supabaseService.getClient()
        .from(this.reportsTable)
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.mapDatabaseReportToReport(data);

    } catch (error) {
      logger.error('Get reconciliation report failed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async getReconciliationMetrics(
    startDate: string, 
    endDate: string, 
    userId?: string
  ): Promise<ReconciliationMetrics> {
    try {
      let query = supabaseService.getClient()
        .from(this.matchesTable)
        .select('match_score, match_type, time_difference_minutes')
        .gte('matched_at', startDate)
        .lte('matched_at', endDate);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: matches, error } = await query;

      if (error) {
        throw error;
      }

      const totalMatches = matches?.length || 0;
      const automaticMatches = matches?.filter(m => m.match_type === 'automatic').length || 0;
      const manualMatches = matches?.filter(m => m.match_type === 'manual').length || 0;

      const averageMatchScore = totalMatches > 0
        ? matches!.reduce((sum, m) => sum + m.match_score, 0) / totalMatches
        : 0;

      const averageTimeDifference = totalMatches > 0
        ? matches!.reduce((sum, m) => sum + m.time_difference_minutes, 0) / totalMatches
        : 0;

      // Get total transactions for match rate calculation
      let transactionQuery = supabaseService.getClient()
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (userId) {
        transactionQuery = transactionQuery.eq('user_id', userId);
      }

      const { count: totalTransactions } = await transactionQuery;

      const matchRate = totalTransactions && totalTransactions > 0
        ? (totalMatches / totalTransactions) * 100
        : 0;

      return {
        matchRate,
        averageMatchScore,
        averageTimeDifference,
        totalMatches,
        automaticMatches,
        manualMatches
      };

    } catch (error) {
      logger.error('Get reconciliation metrics failed', {
        startDate,
        endDate,
        userId: userId || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        matchRate: 0,
        averageMatchScore: 0,
        averageTimeDifference: 0,
        totalMatches: 0,
        automaticMatches: 0,
        manualMatches: 0
      };
    }
  }

  private findReconciliationCandidates(
    transactions: any[],
    logbookEntries: any[],
    config: ReconciliationConfig
  ): ReconciliationCandidate[] {
    const candidates: ReconciliationCandidate[] = [];

    for (const transaction of transactions) {
      for (const logbookEntry of logbookEntries) {
        // Skip if different users
        if (transaction.userId !== logbookEntry.userId) {
          continue;
        }

        // Skip if different currencies
        if (transaction.currency !== logbookEntry.currency) {
          continue;
        }

        // Calculate time difference in minutes
        const timeDiff = Math.abs(
          new Date(transaction.createdAt).getTime() - 
          new Date(logbookEntry.createdAt).getTime()
        ) / (1000 * 60);

        // Skip if outside time window
        if (timeDiff > config.timeWindowMinutes) {
          continue;
        }

        // Calculate amount difference
        const amountDiff = Math.abs(transaction.amount - logbookEntry.amountMinor);
        const amountTolerance = (transaction.amount * config.amountTolerancePercent) / 100;

        // Skip if amount difference exceeds tolerance
        if (amountDiff > amountTolerance) {
          continue;
        }

        // Calculate match score
        const matchScore = this.calculateMatchScore(
          transaction,
          logbookEntry,
          timeDiff,
          amountDiff,
          config
        );

        // Skip if below minimum score
        if (matchScore < config.minimumMatchScore) {
          continue;
        }

        candidates.push({
          transactionId: transaction.id,
          logbookEntryId: logbookEntry.id,
          userId: transaction.userId,
          transactionAmount: transaction.amount,
          logbookAmount: logbookEntry.amountMinor,
          currency: transaction.currency,
          transactionDate: transaction.createdAt,
          logbookDate: logbookEntry.createdAt,
          matchScore,
          timeDifferenceMinutes: timeDiff,
          amountDifferenceMinor: amountDiff,
          reasons: this.getMatchReasons(transaction, logbookEntry, timeDiff, amountDiff)
        });
      }
    }

    // Sort by match score descending
    return candidates.sort((a, b) => b.matchScore - a.matchScore);
  }

  private calculateMatchScore(
    transaction: any,
    logbookEntry: any,
    timeDiff: number,
    amountDiff: number,
    config: ReconciliationConfig
  ): number {
    let score = 0;

    // Perfect amount match gets 40% of score
    if (amountDiff === 0) {
      score += 0.4;
    } else {
      // Partial credit based on amount tolerance
      const tolerance = (transaction.amount * config.amountTolerancePercent) / 100;
      if (tolerance > 0) {
        score += 0.4 * (1 - (amountDiff / tolerance));
      }
    }

    // Time proximity gets 30% of score
    const timeScore = Math.max(0, 1 - (timeDiff / config.timeWindowMinutes));
    score += 0.3 * timeScore;

    // Same user gets 20% of score
    if (transaction.userId === logbookEntry.userId) {
      score += 0.2;
    }

    // Same currency gets 10% of score
    if (transaction.currency === logbookEntry.currency) {
      score += 0.1;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private getMatchReasons(
    transaction: any,
    logbookEntry: any,
    timeDiff: number,
    amountDiff: number
  ): string[] {
    const reasons: string[] = [];

    if (amountDiff === 0) {
      reasons.push('Exact amount match');
    } else if (amountDiff < 100) { // Less than 1 major unit
      reasons.push('Close amount match');
    }

    if (timeDiff < 1) {
      reasons.push('Same minute');
    } else if (timeDiff < 5) {
      reasons.push('Within 5 minutes');
    } else {
      reasons.push(`Within ${Math.round(timeDiff)} minutes`);
    }

    if (transaction.userId === logbookEntry.userId) {
      reasons.push('Same user');
    }

    if (transaction.currency === logbookEntry.currency) {
      reasons.push('Same currency');
    }

    return reasons;
  }

  private createMatchFromCandidate(
    candidate: ReconciliationCandidate,
    matchType: 'automatic' | 'manual',
    correlationId: string
  ): ReconciliationMatch {
    return {
      id: uuidv4(),
      logbookEntryId: candidate.logbookEntryId,
      transactionId: candidate.transactionId,
      userId: candidate.userId,
      matchScore: candidate.matchScore,
      matchType,
      matchCriteria: {
        amountMatch: candidate.amountDifferenceMinor === 0,
        timeMatch: candidate.timeDifferenceMinutes <= 10,
        currencyMatch: true, // Already filtered by currency
        userMatch: true // Already filtered by user
      },
      timeDifferenceMinutes: candidate.timeDifferenceMinutes,
      amountDifferenceMinor: candidate.amountDifferenceMinor,
      matchedAt: new Date().toISOString()
    };
  }

  private createUnmatchedTransaction(
    transaction: any,
    candidates: ReconciliationCandidate[]
  ): UnmatchedTransaction {
    const possibleMatches = candidates
      .filter(c => c.transactionId === transaction.id)
      .slice(0, 5); // Top 5 candidates

    return {
      id: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount / 100, // Convert to major units
      currency: transaction.currency,
      reference: transaction.reference,
      status: transaction.status,
      createdAt: transaction.createdAt,
      possibleMatches
    };
  }

  private createUnmatchedLogbookEntry(
    logbookEntry: any,
    candidates: ReconciliationCandidate[]
  ): UnmatchedLogbookEntry {
    const possibleMatches = candidates
      .filter(c => c.logbookEntryId === logbookEntry.id)
      .slice(0, 5); // Top 5 candidates

    return {
      id: logbookEntry.id,
      userId: logbookEntry.userId,
      type: logbookEntry.type,
      amount: logbookEntry.amountMinor / 100, // Convert to major units
      currency: logbookEntry.currency,
      note: logbookEntry.note,
      createdAt: logbookEntry.createdAt,
      possibleMatches
    };
  }

  private async getTransactionsForReconciliation(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<any[]> {
    let query = supabaseService.getClient()
      .from('transactions')
      .select('id, user_id, amount, currency, reference, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'success'); // Only successful transactions

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async getLogbookEntriesForReconciliation(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<any[]> {
    let query = supabaseService.getClient()
      .from('logbook_entries')
      .select('id, user_id, type, amount_minor, currency, note, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('is_reconciled', false); // Only unreconciled entries

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  private async getTransactionById(transactionId: string): Promise<any | null> {
    const { data, error } = await supabaseService.getClient()
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  private async getLogbookEntryById(logbookEntryId: string): Promise<any | null> {
    const { data, error } = await supabaseService.getClient()
      .from('logbook_entries')
      .select('*')
      .eq('id', logbookEntryId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  private async findExistingMatch(
    transactionId: string,
    logbookEntryId: string
  ): Promise<ReconciliationMatch | null> {
    const { data, error } = await supabaseService.getClient()
      .from(this.matchesTable)
      .select('*')
      .or(`transaction_id.eq.${transactionId},logbook_entry_id.eq.${logbookEntryId}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ? this.mapDatabaseMatchToMatch(data) : null;
  }

  private async storeMatches(matches: ReconciliationMatch[]): Promise<void> {
    if (matches.length === 0) return;

    const dbMatches = matches.map(match => ({
      id: match.id,
      logbook_entry_id: match.logbookEntryId,
      transaction_id: match.transactionId,
      user_id: match.userId,
      match_score: match.matchScore,
      match_type: match.matchType,
      match_criteria: match.matchCriteria,
      time_difference_minutes: match.timeDifferenceMinutes,
      amount_difference_minor: match.amountDifferenceMinor,
      matched_at: match.matchedAt,
      matched_by: match.matchedBy,
      notes: match.notes
    }));

    const { error } = await supabaseService.getClient()
      .from(this.matchesTable)
      .insert(dbMatches);

    if (error) {
      throw error;
    }
  }

  private async storeReconciliationReport(report: ReconciliationReport): Promise<void> {
    const dbReport = {
      id: report.id,
      report_date: report.reportDate,
      date_range: report.dateRange,
      summary: report.summary,
      matches: report.matches,
      unmatched_transactions: report.unmatchedTransactions,
      unmatched_logbook_entries: report.unmatchedLogbookEntries,
      generated_at: report.generatedAt,
      generated_by: report.generatedBy,
      correlation_id: report.correlationId
    };

    const { error } = await supabaseService.getClient()
      .from(this.reportsTable)
      .insert(dbReport);

    if (error) {
      throw error;
    }
  }

  private mapDatabaseMatchToMatch(dbMatch: DatabaseReconciliationMatch): ReconciliationMatch {
    return {
      id: dbMatch.id,
      logbookEntryId: dbMatch.logbook_entry_id,
      transactionId: dbMatch.transaction_id,
      userId: dbMatch.user_id,
      matchScore: dbMatch.match_score,
      matchType: dbMatch.match_type,
      matchCriteria: dbMatch.match_criteria,
      timeDifferenceMinutes: dbMatch.time_difference_minutes,
      amountDifferenceMinor: dbMatch.amount_difference_minor,
      matchedAt: dbMatch.matched_at,
      matchedBy: dbMatch.matched_by || undefined,
      notes: dbMatch.notes || undefined
    };
  }

  private mapDatabaseReportToReport(dbReport: DatabaseReconciliationReport): ReconciliationReport {
    return {
      id: dbReport.id,
      reportDate: dbReport.report_date,
      dateRange: dbReport.date_range,
      summary: dbReport.summary,
      matches: dbReport.matches,
      unmatchedTransactions: dbReport.unmatched_transactions,
      unmatchedLogbookEntries: dbReport.unmatched_logbook_entries,
      generatedAt: dbReport.generated_at,
      generatedBy: dbReport.generated_by,
      correlationId: dbReport.correlation_id
    };
  }
}
