/**
 * Database-Based Balance Service for CalvaryPay
 * Replaces the file-based system with robust database operations
 */

import { supabaseService } from '@/lib/supabase';

// ========================================
// INTERFACES
// ========================================

export interface BalanceUpdate {
  companyId: string;
  previousBalance: number;
  newBalance: number;
  amount: number;
  currency: string;
  reference: string;
  purpose: string;
  timestamp: string;
  type: 'credit' | 'debit';
}

export interface CompanyBalance {
  companyId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  totalDeposits: number;
  totalWithdrawals: number;
  totalAllocations: number;
}

export interface EmployeeBalance {
  employeeId: string;
  companyId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  totalReceived: number;
  totalSent: number;
  totalAllocations: number;
}

export interface BalanceTransaction {
  id: string;
  reference: string;
  entityId: string;
  entityType: 'company' | 'employee';
  transactionType: string;
  amount: number;
  currency: string;
  previousBalance: number;
  newBalance: number;
  fee: number;
  netAmount: number;
  purpose?: string;
  description?: string;
  processedAt: string;
  createdAt: string;
}

export interface BudgetAllocation {
  id: string;
  reference: string;
  employeeId: string;
  companyId: string;
  amount: number;
  currency: string;
  budgetType: string;
  description?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  allocatedBy: string;
  allocatedAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  expiryDate?: string;
  notes?: string;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert major currency units to minor units (e.g., GHS to pesewas)
 */
function toMinorUnits(amount: number, currency: string = 'GHS'): number {
  const multipliers: Record<string, number> = {
    'GHS': 100,  // 1 GHS = 100 pesewas
    'NGN': 100,  // 1 NGN = 100 kobo
    'USD': 100,  // 1 USD = 100 cents
    'EUR': 100   // 1 EUR = 100 cents
  };
  
  return Math.round(amount * (multipliers[currency] || 100));
}

/**
 * Convert minor currency units to major units
 */
function toMajorUnits(amount: number, currency: string = 'GHS'): number {
  const divisors: Record<string, number> = {
    'GHS': 100,
    'NGN': 100,
    'USD': 100,
    'EUR': 100
  };
  
  return amount / (divisors[currency] || 100);
}

// ========================================
// COMPANY BALANCE SERVICE
// ========================================

export class CompanyBalanceService {
  /**
   * Get current balance for a company
   */
  static async getBalance(companyId: string): Promise<CompanyBalance> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.company_balances')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No balance found, create default
          return await this.createDefaultBalance(companyId);
        }
        throw error;
      }

      return {
        companyId: data.company_id,
        balance: toMajorUnits(data.balance_minor, data.currency),
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalDeposits: toMajorUnits(data.total_deposits_minor, data.currency),
        totalWithdrawals: toMajorUnits(data.total_withdrawals_minor, data.currency),
        totalAllocations: toMajorUnits(data.total_allocations_minor, data.currency)
      };
    } catch (error) {
      console.error('CompanyBalanceService.getBalance error:', error);
      throw new Error(`Failed to get company balance: ${error.message}`);
    }
  }

  /**
   * Create default balance for a company
   */
  private static async createDefaultBalance(companyId: string): Promise<CompanyBalance> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.company_balances')
        .insert({
          company_id: companyId,
          balance_minor: 0,
          currency: 'GHS',
          total_deposits_minor: 0,
          total_withdrawals_minor: 0,
          total_allocations_minor: 0
        })
        .select()
        .single();

      if (error) throw error;

      return {
        companyId: data.company_id,
        balance: 0,
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalAllocations: 0
      };
    } catch (error) {
      console.error('CompanyBalanceService.createDefaultBalance error:', error);
      throw new Error(`Failed to create default company balance: ${error.message}`);
    }
  }

  /**
   * Update company balance
   */
  static async updateBalance(
    companyId: string,
    amount: number,
    transactionType: 'deposit' | 'withdrawal' | 'allocation',
    reference: string,
    purpose?: string
  ): Promise<CompanyBalance> {
    try {
      // Use the database function for atomic balance update
      const { data, error } = await supabaseService.rpc(
        'balance_schema.update_company_balance',
        {
          p_company_id: companyId,
          p_amount_minor: toMinorUnits(amount),
          p_transaction_type: transactionType,
          p_reference: reference,
          p_purpose: purpose || `${transactionType} transaction`
        }
      );

      if (error) throw error;

      return {
        companyId: data.company_id,
        balance: toMajorUnits(data.balance_minor, data.currency),
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalDeposits: toMajorUnits(data.total_deposits_minor, data.currency),
        totalWithdrawals: toMajorUnits(data.total_withdrawals_minor, data.currency),
        totalAllocations: toMajorUnits(data.total_allocations_minor, data.currency)
      };
    } catch (error) {
      console.error('CompanyBalanceService.updateBalance error:', error);
      throw new Error(`Failed to update company balance: ${error.message}`);
    }
  }

  /**
   * Get company balance with recent transactions
   */
  static async getBalanceWithTransactions(
    companyId: string,
    limit: number = 10
  ): Promise<{ balance: CompanyBalance; transactions: BalanceTransaction[] }> {
    try {
      const { data, error } = await supabaseService.rpc(
        'balance_schema.get_company_balance_with_transactions',
        {
          p_company_id: companyId,
          p_limit: limit
        }
      );

      if (error) throw error;

      if (!data || data.length === 0) {
        const balance = await this.getBalance(companyId);
        return { balance, transactions: [] };
      }

      const balanceData = data[0];
      const balance: CompanyBalance = {
        companyId,
        balance: toMajorUnits(balanceData.balance_minor, balanceData.currency),
        currency: balanceData.currency,
        lastUpdated: balanceData.last_updated,
        totalDeposits: toMajorUnits(balanceData.total_deposits_minor, balanceData.currency),
        totalWithdrawals: toMajorUnits(balanceData.total_withdrawals_minor, balanceData.currency),
        totalAllocations: toMajorUnits(balanceData.total_allocations_minor, balanceData.currency)
      };

      const transactions: BalanceTransaction[] = (balanceData.recent_transactions || []).map((t: any) => ({
        id: t.id,
        reference: t.reference,
        entityId: companyId,
        entityType: 'company' as const,
        transactionType: t.type,
        amount: toMajorUnits(t.amount_minor, t.currency),
        currency: t.currency,
        previousBalance: 0, // Not available from this function
        newBalance: toMajorUnits(t.amount_minor, t.currency),
        fee: 0,
        netAmount: toMajorUnits(t.amount_minor, t.currency),
        purpose: t.purpose,
        description: t.description,
        processedAt: t.processed_at,
        createdAt: t.created_at || t.processed_at
      }));

      return { balance, transactions };
    } catch (error) {
      console.error('CompanyBalanceService.getBalanceWithTransactions error:', error);
      throw new Error(`Failed to get company balance with transactions: ${error.message}`);
    }
  }

  /**
   * Get all company balances
   */
  static async getAllBalances(): Promise<CompanyBalance[]> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.company_balances')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        companyId: item.company_id,
        balance: toMajorUnits(item.balance_minor, item.currency),
        currency: item.currency,
        lastUpdated: item.last_updated,
        totalDeposits: toMajorUnits(item.total_deposits_minor, item.currency),
        totalWithdrawals: toMajorUnits(item.total_withdrawals_minor, item.currency),
        totalAllocations: toMajorUnits(item.total_allocations_minor, item.currency)
      }));
    } catch (error) {
      console.error('CompanyBalanceService.getAllBalances error:', error);
      throw new Error(`Failed to get all company balances: ${error.message}`);
    }
  }
}

// ========================================
// EMPLOYEE BALANCE SERVICE
// ========================================

export class EmployeeBalanceService {
  /**
   * Get current balance for an employee
   */
  static async getBalance(employeeId: string): Promise<EmployeeBalance> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.employee_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No balance found, create default
          return await this.createDefaultBalance(employeeId);
        }
        throw error;
      }

      return {
        employeeId: data.employee_id,
        companyId: data.company_id,
        balance: toMajorUnits(data.balance_minor, data.currency),
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalReceived: toMajorUnits(data.total_received_minor, data.currency),
        totalSent: toMajorUnits(data.total_sent_minor, data.currency),
        totalAllocations: toMajorUnits(data.total_allocations_minor, data.currency)
      };
    } catch (error) {
      console.error('EmployeeBalanceService.getBalance error:', error);
      throw new Error(`Failed to get employee balance: ${error.message}`);
    }
  }

  /**
   * Create default balance for an employee
   */
  private static async createDefaultBalance(employeeId: string): Promise<EmployeeBalance> {
    try {
      // Get company ID from user table
      const { data: userData, error: userError } = await supabaseService
        .from('calvary_users')
        .select('company_id')
        .eq('id', employeeId)
        .single();

      if (userError) throw userError;

      const { data, error } = await supabaseService
        .from('balance_schema.employee_balances')
        .insert({
          employee_id: employeeId,
          company_id: userData.company_id,
          balance_minor: 0,
          currency: 'GHS',
          total_received_minor: 0,
          total_sent_minor: 0,
          total_allocations_minor: 0
        })
        .select()
        .single();

      if (error) throw error;

      return {
        employeeId: data.employee_id,
        companyId: data.company_id,
        balance: 0,
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalReceived: 0,
        totalSent: 0,
        totalAllocations: 0
      };
    } catch (error) {
      console.error('EmployeeBalanceService.createDefaultBalance error:', error);
      throw new Error(`Failed to create default employee balance: ${error.message}`);
    }
  }

  /**
   * Update employee balance
   */
  static async updateBalance(
    employeeId: string,
    amount: number,
    transactionType: 'budget_credit' | 'budget_debit' | 'transfer_sent' | 'transfer_received',
    reference: string,
    description?: string
  ): Promise<EmployeeBalance> {
    try {
      // Use the database function for atomic balance update
      const { data, error } = await supabaseService.rpc(
        'balance_schema.update_employee_balance',
        {
          p_employee_id: employeeId,
          p_company_id: null, // Will be retrieved from existing record
          p_amount_minor: toMinorUnits(amount),
          p_transaction_type: transactionType,
          p_reference: reference,
          p_description: description || `${transactionType} transaction`
        }
      );

      if (error) throw error;

      return {
        employeeId: data.employee_id,
        companyId: data.company_id,
        balance: toMajorUnits(data.balance_minor, data.currency),
        currency: data.currency,
        lastUpdated: data.last_updated,
        totalReceived: toMajorUnits(data.total_received_minor, data.currency),
        totalSent: toMajorUnits(data.total_sent_minor, data.currency),
        totalAllocations: toMajorUnits(data.total_allocations_minor, data.currency)
      };
    } catch (error) {
      console.error('EmployeeBalanceService.updateBalance error:', error);
      throw new Error(`Failed to update employee balance: ${error.message}`);
    }
  }

  /**
   * Get employee balance with recent transactions and allocations
   */
  static async getBalanceWithTransactions(
    employeeId: string,
    limit: number = 10
  ): Promise<{ 
    balance: EmployeeBalance; 
    transactions: BalanceTransaction[]; 
    allocations: BudgetAllocation[] 
  }> {
    try {
      const { data, error } = await supabaseService.rpc(
        'balance_schema.get_employee_balance_with_transactions',
        {
          p_employee_id: employeeId,
          p_limit: limit
        }
      );

      if (error) throw error;

      if (!data || data.length === 0) {
        const balance = await this.getBalance(employeeId);
        return { balance, transactions: [], allocations: [] };
      }

      const balanceData = data[0];
      const balance: EmployeeBalance = {
        employeeId,
        companyId: balanceData.company_id,
        balance: toMajorUnits(balanceData.balance_minor, balanceData.currency),
        currency: balanceData.currency,
        lastUpdated: balanceData.last_updated,
        totalReceived: toMajorUnits(balanceData.total_received_minor, balanceData.currency),
        totalSent: toMajorUnits(balanceData.total_sent_minor, balanceData.currency),
        totalAllocations: toMajorUnits(balanceData.total_allocations_minor, balanceData.currency)
      };

      const transactions: BalanceTransaction[] = (balanceData.recent_transactions || []).map((t: any) => ({
        id: t.id,
        reference: t.reference,
        entityId: employeeId,
        entityType: 'employee' as const,
        transactionType: t.type,
        amount: toMajorUnits(t.amount_minor, t.currency),
        currency: t.currency,
        previousBalance: 0, // Not available from this function
        newBalance: toMajorUnits(t.amount_minor, t.currency),
        fee: 0,
        netAmount: toMajorUnits(t.amount_minor, t.currency),
        purpose: t.purpose,
        description: t.description,
        processedAt: t.processed_at,
        createdAt: t.created_at || t.processed_at
      }));

      const allocations: BudgetAllocation[] = (balanceData.recent_allocations || []).map((a: any) => ({
        id: a.id,
        reference: a.reference,
        employeeId,
        companyId: a.company_id,
        amount: toMajorUnits(a.amount_minor, a.currency),
        currency: a.currency,
        budgetType: a.budget_type,
        description: a.description,
        status: a.status,
        allocatedBy: a.allocated_by,
        allocatedAt: a.allocated_at,
        acceptedAt: a.accepted_at,
        rejectedAt: a.rejected_at,
        expiryDate: a.expiry_date,
        notes: a.notes
      }));

      return { balance, transactions, allocations };
    } catch (error) {
      console.error('EmployeeBalanceService.getBalanceWithTransactions error:', error);
      throw new Error(`Failed to get employee balance with transactions: ${error.message}`);
    }
  }

  /**
   * Create budget allocation
   */
  static async createBudgetAllocation(
    employeeId: string,
    companyId: string,
    amount: number,
    budgetType: string,
    description?: string,
    expiryDate?: string
  ): Promise<BudgetAllocation> {
    try {
      const allocationReference = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabaseService
        .from('balance_schema.budget_allocations')
        .insert({
          allocation_reference: allocationReference,
          employee_id: employeeId,
          company_id: companyId,
          amount_minor: toMinorUnits(amount),
          currency: 'GHS',
          budget_type: budgetType,
          description: description || `Budget allocation: ${budgetType}`,
          status: 'pending',
          allocated_by: companyId,
          allocated_at: new Date().toISOString(),
          expiry_date: expiryDate
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        reference: data.allocation_reference,
        employeeId: data.employee_id,
        companyId: data.company_id,
        amount: toMajorUnits(data.amount_minor, data.currency),
        currency: data.currency,
        budgetType: data.budget_type,
        description: data.description,
        status: data.status,
        allocatedBy: data.allocated_by,
        allocatedAt: data.allocated_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        expiryDate: data.expiry_date,
        notes: data.notes
      };
    } catch (error) {
      console.error('EmployeeBalanceService.createBudgetAllocation error:', error);
      throw new Error(`Failed to create budget allocation: ${error.message}`);
    }
  }

  /**
   * Update budget allocation status
   */
  static async updateAllocationStatus(
    allocationReference: string,
    status: 'accepted' | 'rejected',
    employeeId?: string
  ): Promise<BudgetAllocation> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (status === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
      }

      const { data, error } = await supabaseService
        .from('balance_schema.budget_allocations')
        .update(updateData)
        .eq('allocation_reference', allocationReference)
        .select()
        .single();

      if (error) throw error;

      // If accepted, update employee balance
      if (status === 'accepted' && employeeId) {
        await this.updateBalance(
          employeeId,
          toMajorUnits(data.amount_minor, data.currency),
          'budget_credit',
          allocationReference,
          `Accepted budget allocation: ${data.budget_type}`
        );
      }

      return {
        id: data.id,
        reference: data.allocation_reference,
        employeeId: data.employee_id,
        companyId: data.company_id,
        amount: toMajorUnits(data.amount_minor, data.currency),
        currency: data.currency,
        budgetType: data.budget_type,
        description: data.description,
        status: data.status,
        allocatedBy: data.allocated_by,
        allocatedAt: data.allocated_at,
        acceptedAt: data.accepted_at,
        rejectedAt: data.rejected_at,
        expiryDate: data.expiry_date,
        notes: data.notes
      };
    } catch (error) {
      console.error('EmployeeBalanceService.updateAllocationStatus error:', error);
      throw new Error(`Failed to update allocation status: ${error.message}`);
    }
  }

  /**
   * Get all budget allocations for an employee
   */
  static async getBudgetAllocations(employeeId: string): Promise<BudgetAllocation[]> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.budget_allocations')
        .select('*')
        .eq('employee_id', employeeId)
        .order('allocated_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        reference: item.allocation_reference,
        employeeId: item.employee_id,
        companyId: item.company_id,
        amount: toMajorUnits(item.amount_minor, item.currency),
        currency: item.currency,
        budgetType: item.budget_type,
        description: item.description,
        status: item.status,
        allocatedBy: item.allocated_by,
        allocatedAt: item.allocated_at,
        acceptedAt: item.accepted_at,
        rejectedAt: item.rejected_at,
        expiryDate: item.expiry_date,
        notes: item.notes
      }));
    } catch (error) {
      console.error('EmployeeBalanceService.getBudgetAllocations error:', error);
      throw new Error(`Failed to get budget allocations: ${error.message}`);
    }
  }

  /**
   * Get all employee balances for a company
   */
  static async getCompanyEmployeeBalances(companyId: string): Promise<EmployeeBalance[]> {
    try {
      const { data, error } = await supabaseService
        .from('balance_schema.employee_balances')
        .select('*')
        .eq('company_id', companyId)
        .order('last_updated', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        employeeId: item.employee_id,
        companyId: item.company_id,
        balance: toMajorUnits(item.balance_minor, item.currency),
        currency: item.currency,
        lastUpdated: item.last_updated,
        totalReceived: toMajorUnits(item.total_received_minor, item.currency),
        totalSent: toMajorUnits(item.total_sent_minor, item.currency),
        totalAllocations: toMajorUnits(item.total_allocations_minor, item.currency)
      }));
    } catch (error) {
      console.error('EmployeeBalanceService.getCompanyEmployeeBalances error:', error);
      throw new Error(`Failed to get company employee balances: ${error.message}`);
    }
  }
}

// ========================================
// TRANSACTION SERVICE
// ========================================

export class TransactionService {
  /**
   * Get transaction history for an entity
   */
  static async getTransactionHistory(
    entityId: string,
    entityType: 'company' | 'employee',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ transactions: BalanceTransaction[]; total: number }> {
    try {
      // Get total count
      const { count, error: countError } = await supabaseService
        .from('balance_schema.balance_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);

      if (countError) throw countError;

      // Get transactions
      const { data, error } = await supabaseService
        .from('balance_schema.balance_transactions')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('processed_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const transactions: BalanceTransaction[] = data.map(item => ({
        id: item.id,
        reference: item.transaction_reference,
        entityId: item.entity_id,
        entityType: item.entity_type,
        transactionType: item.transaction_type,
        amount: toMajorUnits(item.amount_minor, item.currency),
        currency: item.currency,
        previousBalance: toMajorUnits(item.previous_balance_minor, item.currency),
        newBalance: toMajorUnits(item.new_balance_minor, item.currency),
        fee: toMajorUnits(item.fee_minor, item.currency),
        netAmount: toMajorUnits(item.net_amount_minor, item.currency),
        purpose: item.purpose,
        description: item.description,
        processedAt: item.processed_at,
        createdAt: item.created_at
      }));

      return { transactions, total: count || 0 };
    } catch (error) {
      console.error('TransactionService.getTransactionHistory error:', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Get balance history for an entity
   */
  static async getBalanceHistory(
    entityId: string,
    entityType: 'company' | 'employee',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ history: any[]; total: number }> {
    try {
      // Get total count
      const { count, error: countError } = await supabaseService
        .from('balance_schema.balance_history')
        .select('*', { count: 'exact', head: true })
        .eq('entity_id', entityId)
        .eq('entity_type', entityType);

      if (countError) throw countError;

      // Get history
      const { data, error } = await supabaseService
        .from('balance_schema.balance_history')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const history = data.map(item => ({
        id: item.id,
        entityId: item.entity_id,
        entityType: item.entity_type,
        previousBalance: toMajorUnits(item.previous_balance_minor, 'GHS'),
        newBalance: toMajorUnits(item.new_balance_minor, 'GHS'),
        changeAmount: toMajorUnits(item.change_amount_minor, 'GHS'),
        changeType: item.change_type,
        transactionReference: item.transaction_reference,
        reason: item.reason,
        timestamp: item.timestamp
      }));

      return { history, total: count || 0 };
    } catch (error) {
      console.error('TransactionService.getBalanceHistory error:', error);
      throw new Error(`Failed to get balance history: ${error.message}`);
    }
  }
}

// ========================================
// EXPORT DEFAULT INSTANCES
// ========================================

export default {
  CompanyBalanceService,
  EmployeeBalanceService,
  TransactionService
}; 