/**
 * Enhanced Reconciliation Service for CalvaryPay
 * Handles automatic and manual reconciliation between payments and logbook entries
 */

import { z } from 'zod'
import { supabaseService } from '@/lib/supabase'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'

// Validation schemas
const ReconciliationRequestSchema = z.object({
  transactionId: z.string().uuid(),
  logbookEntryId: z.string().uuid(),
  reconciliationType: z.enum(['automatic', 'manual', 'bulk']).default('manual'),
  notes: z.string().max(1000).optional()
})

const BulkReconciliationSchema = z.object({
  userId: z.string().uuid(),
  timeWindow: z.number().positive().max(86400000).default(600000), // Default 10 minutes
  amountTolerance: z.number().min(0).max(0.1).default(0.01), // Default 1%
  autoApprove: z.boolean().default(false)
})

// Interfaces
export interface ReconciliationMatch {
  transactionId: string
  logbookEntryId: string
  confidenceScore: number
  matchingFactors: {
    amountMatch: boolean
    timeMatch: boolean
    locationMatch: boolean
    descriptionMatch: boolean
  }
  transaction: {
    id: string
    reference: string
    amount: number
    currency: string
    paidAt: string
    description?: string
  }
  logbookEntry: {
    id: string
    type: string
    amount: number
    currency: string
    title: string
    description?: string
    entryDate: string
    locationName?: string
  }
}

export interface ReconciliationResult {
  success: boolean
  data?: {
    reconciliationId: string
    transactionId: string
    logbookEntryId: string
    confidenceScore: number
    reconciliationType: string
  }
  error?: string
}

export interface BulkReconciliationResult {
  success: boolean
  data?: {
    totalProcessed: number
    automaticMatches: number
    manualReviewRequired: number
    matches: ReconciliationMatch[]
  }
  error?: string
}

export interface ReconciliationStats {
  totalTransactions: number
  totalLogbookEntries: number
  reconciledTransactions: number
  reconciledLogbookEntries: number
  reconciliationRate: number
  pendingReconciliation: {
    transactions: number
    logbookEntries: number
  }
  recentActivity: Array<{
    date: string
    reconciliations: number
    automaticMatches: number
    manualMatches: number
  }>
}

export class ReconciliationService {
  private static instance: ReconciliationService

  static getInstance(): ReconciliationService {
    if (!ReconciliationService.instance) {
      ReconciliationService.instance = new ReconciliationService()
    }
    return ReconciliationService.instance
  }

  /**
   * Perform automatic reconciliation for a user
   */
  async performAutomaticReconciliation(
    userId: string,
    timeWindow: number = 600000, // 10 minutes
    amountTolerance: number = 0.01 // 1%
  ): Promise<BulkReconciliationResult> {
    try {
      // Validate input
      const validation = enhancedSecurityService.validateAndSanitizeInput(
        { userId, timeWindow, amountTolerance, autoApprove: false },
        BulkReconciliationSchema
      )
      
      if (!validation.success) {
        return { success: false, error: `Validation failed: ${validation.errors?.join(', ')}` }
      }

      // Get unreconciled transactions
      const { data: transactions, error: transactionError } = await supabaseService.client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'success')
        .eq('reconciled', false)
        .order('paid_at', { ascending: false })

      if (transactionError) {
        console.error('Error fetching transactions:', transactionError)
        return { success: false, error: 'Failed to fetch transactions' }
      }

      // Get unreconciled logbook entries
      const { data: logbookEntries, error: logbookError } = await supabaseService.client
        .from('logbook_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('is_reconciled', false)
        .order('created_at', { ascending: false })

      if (logbookError) {
        console.error('Error fetching logbook entries:', logbookError)
        return { success: false, error: 'Failed to fetch logbook entries' }
      }

      const matches: ReconciliationMatch[] = []
      let automaticMatches = 0

      // Find potential matches
      for (const transaction of transactions || []) {
        for (const entry of logbookEntries || []) {
          const match = this.calculateMatch(transaction, entry, timeWindow, amountTolerance)
          
          if (match.confidenceScore >= 0.8) {
            matches.push(match)
            
            // Auto-approve high-confidence matches
            if (match.confidenceScore >= 0.95) {
              await this.createReconciliation(
                transaction.id,
                entry.id,
                'automatic',
                userId,
                match.confidenceScore,
                'High confidence automatic match'
              )
              automaticMatches++
            }
          }
        }
      }

      return {
        success: true,
        data: {
          totalProcessed: (transactions?.length || 0) + (logbookEntries?.length || 0),
          automaticMatches,
          manualReviewRequired: matches.length - automaticMatches,
          matches: matches.filter(m => m.confidenceScore < 0.95) // Return only manual review items
        }
      }
    } catch (error) {
      console.error('Automatic reconciliation error:', error)
      return { success: false, error: 'Failed to perform automatic reconciliation' }
    }
  }

  /**
   * Manually reconcile a transaction with a logbook entry
   */
  async manualReconciliation(
    transactionId: string,
    logbookEntryId: string,
    userId: string,
    notes?: string
  ): Promise<ReconciliationResult> {
    try {
      // Validate input
      const validation = enhancedSecurityService.validateAndSanitizeInput(
        { transactionId, logbookEntryId, reconciliationType: 'manual', notes },
        ReconciliationRequestSchema
      )
      
      if (!validation.success) {
        return { success: false, error: `Validation failed: ${validation.errors?.join(', ')}` }
      }

      // Verify both records exist and belong to the user
      const [transactionResult, logbookResult] = await Promise.all([
        supabaseService.client
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('user_id', userId)
          .eq('reconciled', false)
          .single(),
        supabaseService.client
          .from('logbook_entries')
          .select('*')
          .eq('id', logbookEntryId)
          .eq('user_id', userId)
          .eq('is_reconciled', false)
          .single()
      ])

      if (transactionResult.error || !transactionResult.data) {
        return { success: false, error: 'Transaction not found or already reconciled' }
      }

      if (logbookResult.error || !logbookResult.data) {
        return { success: false, error: 'Logbook entry not found or already reconciled' }
      }

      // Calculate confidence score for the manual match
      const match = this.calculateMatch(transactionResult.data, logbookResult.data)

      // Create reconciliation record
      const reconciliationId = await this.createReconciliation(
        transactionId,
        logbookEntryId,
        'manual',
        userId,
        match.confidenceScore,
        notes
      )

      return {
        success: true,
        data: {
          reconciliationId,
          transactionId,
          logbookEntryId,
          confidenceScore: match.confidenceScore,
          reconciliationType: 'manual'
        }
      }
    } catch (error) {
      console.error('Manual reconciliation error:', error)
      return { success: false, error: 'Failed to perform manual reconciliation' }
    }
  }

  /**
   * Get reconciliation statistics for a user
   */
  async getReconciliationStats(userId: string, startDate?: string, endDate?: string): Promise<{
    success: boolean
    data?: ReconciliationStats
    error?: string
  }> {
    try {
      // Build date filter
      let dateFilter = ''
      if (startDate && endDate) {
        dateFilter = `AND created_at BETWEEN '${startDate}' AND '${endDate}'`
      } else if (startDate) {
        dateFilter = `AND created_at >= '${startDate}'`
      } else if (endDate) {
        dateFilter = `AND created_at <= '${endDate}'`
      }

      // Get transaction stats
      const { data: transactionStats } = await supabaseService.client
        .rpc('get_transaction_stats', { p_user_id: userId, p_date_filter: dateFilter })

      // Get logbook stats
      const { data: logbookStats } = await supabaseService.client
        .rpc('get_logbook_stats', { p_user_id: userId, p_date_filter: dateFilter })

      // Get reconciliation activity
      const { data: recentActivity } = await supabaseService.client
        .rpc('get_reconciliation_activity', { p_user_id: userId, p_days: 30 })

      const stats: ReconciliationStats = {
        totalTransactions: transactionStats?.total_transactions || 0,
        totalLogbookEntries: logbookStats?.total_entries || 0,
        reconciledTransactions: transactionStats?.reconciled_transactions || 0,
        reconciledLogbookEntries: logbookStats?.reconciled_entries || 0,
        reconciliationRate: this.calculateReconciliationRate(
          transactionStats?.reconciled_transactions || 0,
          transactionStats?.total_transactions || 0
        ),
        pendingReconciliation: {
          transactions: (transactionStats?.total_transactions || 0) - (transactionStats?.reconciled_transactions || 0),
          logbookEntries: (logbookStats?.total_entries || 0) - (logbookStats?.reconciled_entries || 0)
        },
        recentActivity: recentActivity || []
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Error fetching reconciliation stats:', error)
      return { success: false, error: 'Failed to fetch reconciliation statistics' }
    }
  }

  /**
   * Get potential matches for manual review
   */
  async getPotentialMatches(userId: string, limit: number = 50): Promise<{
    success: boolean
    data?: ReconciliationMatch[]
    error?: string
  }> {
    try {
      // Get unreconciled transactions and logbook entries
      const [transactionResult, logbookResult] = await Promise.all([
        supabaseService.client
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'success')
          .eq('reconciled', false)
          .order('paid_at', { ascending: false })
          .limit(limit),
        supabaseService.client
          .from('logbook_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('is_reconciled', false)
          .order('created_at', { ascending: false })
          .limit(limit)
      ])

      if (transactionResult.error || logbookResult.error) {
        return { success: false, error: 'Failed to fetch data for matching' }
      }

      const matches: ReconciliationMatch[] = []

      // Find potential matches
      for (const transaction of transactionResult.data || []) {
        for (const entry of logbookResult.data || []) {
          const match = this.calculateMatch(transaction, entry)
          
          if (match.confidenceScore >= 0.3) { // Lower threshold for manual review
            matches.push(match)
          }
        }
      }

      // Sort by confidence score (highest first)
      matches.sort((a, b) => b.confidenceScore - a.confidenceScore)

      return { success: true, data: matches.slice(0, limit) }
    } catch (error) {
      console.error('Error getting potential matches:', error)
      return { success: false, error: 'Failed to get potential matches' }
    }
  }

  // Private helper methods
  private calculateMatch(
    transaction: any,
    logbookEntry: any,
    timeWindow: number = 600000,
    amountTolerance: number = 0.01
  ): ReconciliationMatch {
    const transactionAmount = transaction.currency === 'NGN' ? transaction.amount_minor / 100 : transaction.amount_minor
    const entryAmount = logbookEntry.currency === 'NGN' ? logbookEntry.amount_minor / 100 : logbookEntry.amount_minor

    // Amount match (within tolerance)
    const amountDiff = Math.abs(transactionAmount - entryAmount)
    const amountMatch = amountDiff <= (transactionAmount * amountTolerance)

    // Time match (within time window)
    const transactionTime = new Date(transaction.paid_at || transaction.created_at).getTime()
    const entryTime = new Date(logbookEntry.created_at).getTime()
    const timeDiff = Math.abs(transactionTime - entryTime)
    const timeMatch = timeDiff <= timeWindow

    // Location match (basic implementation)
    const locationMatch = false // TODO: Implement location matching

    // Description match (basic keyword matching)
    const descriptionMatch = this.checkDescriptionMatch(
      transaction.description || '',
      logbookEntry.title + ' ' + (logbookEntry.description || '')
    )

    // Calculate confidence score
    let confidenceScore = 0
    if (amountMatch) confidenceScore += 0.5
    if (timeMatch) confidenceScore += 0.3
    if (locationMatch) confidenceScore += 0.1
    if (descriptionMatch) confidenceScore += 0.1

    return {
      transactionId: transaction.id,
      logbookEntryId: logbookEntry.id,
      confidenceScore: Math.min(confidenceScore, 1.0),
      matchingFactors: {
        amountMatch,
        timeMatch,
        locationMatch,
        descriptionMatch
      },
      transaction: {
        id: transaction.id,
        reference: transaction.paystack_reference,
        amount: transactionAmount,
        currency: transaction.currency,
        paidAt: transaction.paid_at || transaction.created_at,
        description: transaction.description
      },
      logbookEntry: {
        id: logbookEntry.id,
        type: logbookEntry.type,
        amount: entryAmount,
        currency: logbookEntry.currency,
        title: logbookEntry.title,
        description: logbookEntry.description,
        entryDate: logbookEntry.entry_date,
        locationName: logbookEntry.location_name
      }
    }
  }

  private async createReconciliation(
    transactionId: string,
    logbookEntryId: string,
    reconciliationType: string,
    userId: string,
    confidenceScore: number,
    notes?: string
  ): Promise<string> {
    const { data, error } = await supabaseService.client
      .from('payment_reconciliations')
      .insert([{
        transaction_id: transactionId,
        logbook_entry_id: logbookEntryId,
        reconciliation_type: reconciliationType,
        confidence_score: confidenceScore,
        reconciled_by: userId,
        reconciliation_notes: notes
      }])
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create reconciliation: ${error.message}`)
    }

    return data.id
  }

  private checkDescriptionMatch(transactionDesc: string, entryDesc: string): boolean {
    const transactionWords = transactionDesc.toLowerCase().split(/\s+/)
    const entryWords = entryDesc.toLowerCase().split(/\s+/)
    
    const commonWords = transactionWords.filter(word => 
      word.length > 3 && entryWords.includes(word)
    )
    
    return commonWords.length > 0
  }

  private calculateReconciliationRate(reconciled: number, total: number): number {
    return total > 0 ? Math.round((reconciled / total) * 100) : 0
  }
}

export const reconciliationService = ReconciliationService.getInstance()
