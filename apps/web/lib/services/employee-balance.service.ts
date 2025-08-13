/**
 * Employee Balance Service for CalvaryPay
 * Manages employee balances and budget allocations with transaction tracking
 */

import fs from 'fs'
import path from 'path'

// File paths for persistent storage
const EMPLOYEE_BALANCE_FILE_PATH = path.join(process.cwd(), 'data', 'employee-balances.json')
const TRANSACTION_LOG_FILE_PATH = path.join(process.cwd(), 'data', 'transaction-log.json')

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(EMPLOYEE_BALANCE_FILE_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('💰 Employee Balance Service: Created data directory:', dataDir)
  }
}

// Load employee balances from file
const loadEmployeeBalances = (): Map<string, any> => {
  try {
    ensureDataDirectory()
    if (fs.existsSync(EMPLOYEE_BALANCE_FILE_PATH)) {
      const data = fs.readFileSync(EMPLOYEE_BALANCE_FILE_PATH, 'utf8')
      const balances = JSON.parse(data)
      const balanceMap = new Map(Object.entries(balances))
      console.log('💰 Employee Balance Service: Loaded employee balances from file:', {
        filePath: EMPLOYEE_BALANCE_FILE_PATH,
        balanceCount: balanceMap.size,
        employees: Array.from(balanceMap.keys())
      })
      return balanceMap
    } else {
      console.log('💰 Employee Balance Service: No employee balance file found, starting with empty balances')
    }
  } catch (error) {
    console.error('💰 Employee Balance Service: Error loading employee balances from file:', error)
  }
  return new Map()
}

// Save employee balances to file
const saveEmployeeBalances = (balances: Map<string, any>) => {
  try {
    ensureDataDirectory()
    const data = Object.fromEntries(balances)
    fs.writeFileSync(EMPLOYEE_BALANCE_FILE_PATH, JSON.stringify(data, null, 2))
    console.log('💰 Employee Balance Service: Saved employee balances to file:', {
      filePath: EMPLOYEE_BALANCE_FILE_PATH,
      balanceCount: balances.size,
      employees: Array.from(balances.keys())
    })
  } catch (error) {
    console.error('💰 Employee Balance Service: Error saving employee balances to file:', error)
  }
}

// Load transaction log from file
const loadTransactionLog = (): any[] => {
  try {
    ensureDataDirectory()
    if (fs.existsSync(TRANSACTION_LOG_FILE_PATH)) {
      const data = fs.readFileSync(TRANSACTION_LOG_FILE_PATH, 'utf8')
      const transactions = JSON.parse(data)
      console.log('📊 Transaction Log: Loaded transactions from file:', {
        filePath: TRANSACTION_LOG_FILE_PATH,
        transactionCount: transactions.length
      })
      return transactions
    } else {
      console.log('📊 Transaction Log: No transaction log file found, starting with empty log')
    }
  } catch (error) {
    console.error('📊 Transaction Log: Error loading transactions from file:', error)
  }
  return []
}

// Save transaction log to file
const saveTransactionLog = (transactions: any[]) => {
  try {
    ensureDataDirectory()
    fs.writeFileSync(TRANSACTION_LOG_FILE_PATH, JSON.stringify(transactions, null, 2))
    console.log('📊 Transaction Log: Saved transactions to file:', {
      filePath: TRANSACTION_LOG_FILE_PATH,
      transactionCount: transactions.length
    })
  } catch (error) {
    console.error('📊 Transaction Log: Error saving transactions to file:', error)
  }
}

// In-memory cache with file persistence
let employeeBalances: Map<string, any> | null = null
let transactionLog: any[] | null = null

// Get current employee balances
const getCurrentEmployeeBalances = (): Map<string, any> => {
  if (!employeeBalances) {
    console.log('💰 Employee Balance Service: Loading employee balances for the first time')
    employeeBalances = loadEmployeeBalances()
  }
  return employeeBalances
}

// Get current transaction log
const getCurrentTransactionLog = (): any[] => {
  if (!transactionLog) {
    console.log('📊 Transaction Log: Loading transaction log for the first time')
    transactionLog = loadTransactionLog()
  }
  return transactionLog
}

export interface BudgetAllocation {
  allocationId: string;
  employeeId: string;
  companyId: string;
  amount: number;
  currency: string;
  budgetType: string;
  description?: string;
  allocatedBy: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
  expiryDate?: string;
}

export interface EmployeeBalance {
  employeeId: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  totalReceived: number;
  totalSpent: number;
  pendingAllocations: BudgetAllocation[];
}

export interface Transaction {
  transactionId: string;
  type: 'budget_allocation' | 'payment' | 'transfer' | 'deposit' | 'withdrawal';
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  timestamp: string;
  metadata?: any;
}

export class EmployeeBalanceService {
  /**
   * Get current balance for an employee
   */
  static getEmployeeBalance(employeeId: string): EmployeeBalance {
    const balances = getCurrentEmployeeBalances()
    const balanceData = balances.get(employeeId) || {
      balance: 0,
      currency: 'GHS',
      lastUpdated: new Date().toISOString(),
      allocations: [],
      transactions: []
    }

    console.log('💰 Employee Balance Service: Getting balance for employee:', employeeId, balanceData)

    const totalReceived = balanceData.allocations
      ?.filter((a: any) => a.status === 'accepted')
      .reduce((sum: number, a: any) => sum + a.amount, 0) || 0

    const totalSpent = balanceData.transactions
      ?.filter((t: any) => t.type === 'debit')
      .reduce((sum: number, t: any) => sum + t.amount, 0) || 0

    const pendingAllocations = balanceData.allocations
      ?.filter((a: any) => a.status === 'pending') || []

    return {
      employeeId,
      balance: balanceData.balance,
      currency: balanceData.currency,
      lastUpdated: balanceData.lastUpdated,
      totalReceived,
      totalSpent,
      pendingAllocations
    }
  }

  /**
   * Allocate budget to an employee
   */
  static allocateBudget(
    companyId: string,
    employeeId: string,
    amount: number,
    currency: string,
    budgetType: string,
    description: string,
    allocatedBy: string,
    expiryDate?: string
  ): BudgetAllocation {
    console.log('💰 Employee Balance Service: Starting budget allocation:', {
      companyId,
      employeeId,
      amount,
      currency,
      budgetType,
      description,
      allocatedBy
    })

    const allocationId = `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const allocation: BudgetAllocation = {
      allocationId,
      employeeId,
      companyId,
      amount,
      currency: currency.toUpperCase(),
      budgetType,
      description,
      allocatedBy,
      timestamp: new Date().toISOString(),
      status: 'pending',
      expiryDate
    }

    // Get current employee balance data
    const balances = getCurrentEmployeeBalances()
    const currentData = balances.get(employeeId) || {
      balance: 0,
      currency: currency.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      allocations: [],
      transactions: []
    }

    // Add allocation to employee's pending allocations
    const updatedData = {
      ...currentData,
      allocations: [...(currentData.allocations || []), allocation],
      lastUpdated: new Date().toISOString()
    }

    balances.set(employeeId, updatedData)
    saveEmployeeBalances(balances)

    // Log the transaction
    this.logTransaction({
      transactionId: `txn_${allocationId}`,
      type: 'budget_allocation',
      fromUserId: companyId,
      toUserId: employeeId,
      amount,
      currency: currency.toUpperCase(),
      description: `Budget allocation: ${budgetType} - ${description}`,
      reference: allocationId,
      status: 'pending',
      timestamp: new Date().toISOString(),
      metadata: {
        budgetType,
        allocatedBy,
        expiryDate
      }
    })

    console.log('💰 Employee Balance Service: Budget allocated successfully:', allocation)
    return allocation
  }

  /**
   * Accept a budget allocation (employee accepts the allocation)
   */
  static acceptBudgetAllocation(employeeId: string, allocationId: string): boolean {
    console.log('💰 Employee Balance Service: Accepting budget allocation:', { employeeId, allocationId })

    const balances = getCurrentEmployeeBalances()
    const employeeData = balances.get(employeeId)

    if (!employeeData) {
      console.error('💰 Employee Balance Service: Employee not found:', employeeId)
      return false
    }

    const allocation = employeeData.allocations?.find((a: any) => a.allocationId === allocationId)
    
    if (!allocation) {
      console.error('💰 Employee Balance Service: Allocation not found:', allocationId)
      return false
    }

    if (allocation.status !== 'pending') {
      console.error('💰 Employee Balance Service: Allocation already processed:', allocation.status)
      return false
    }

    // Update allocation status
    allocation.status = 'accepted'

    // Add amount to employee balance
    const updatedData = {
      ...employeeData,
      balance: employeeData.balance + allocation.amount,
      lastUpdated: new Date().toISOString(),
      transactions: [
        ...(employeeData.transactions || []),
        {
          id: `credit_${allocationId}`,
          amount: allocation.amount,
          type: 'credit',
          reference: allocationId,
          description: `Accepted budget allocation: ${allocation.budgetType}`,
          timestamp: new Date().toISOString()
        }
      ]
    }

    balances.set(employeeId, updatedData)
    saveEmployeeBalances(balances)

    // Update transaction log
    this.updateTransactionStatus(`txn_${allocationId}`, 'completed')

    console.log('💰 Employee Balance Service: Budget allocation accepted successfully')
    return true
  }

  /**
   * Reject a budget allocation
   */
  static rejectBudgetAllocation(employeeId: string, allocationId: string): boolean {
    console.log('💰 Employee Balance Service: Rejecting budget allocation:', { employeeId, allocationId })

    const balances = getCurrentEmployeeBalances()
    const employeeData = balances.get(employeeId)

    if (!employeeData) {
      console.error('💰 Employee Balance Service: Employee not found:', employeeId)
      return false
    }

    const allocation = employeeData.allocations?.find((a: any) => a.allocationId === allocationId)
    
    if (!allocation) {
      console.error('💰 Employee Balance Service: Allocation not found:', allocationId)
      return false
    }

    if (allocation.status !== 'pending') {
      console.error('💰 Employee Balance Service: Allocation already processed:', allocation.status)
      return false
    }

    // Update allocation status
    allocation.status = 'rejected'

    const updatedData = {
      ...employeeData,
      lastUpdated: new Date().toISOString()
    }

    balances.set(employeeId, updatedData)
    saveEmployeeBalances(balances)

    // Update transaction log
    this.updateTransactionStatus(`txn_${allocationId}`, 'cancelled')

    console.log('💰 Employee Balance Service: Budget allocation rejected successfully')
    return true
  }

  /**
   * Log a transaction
   */
  static logTransaction(transaction: Transaction): void {
    const transactions = getCurrentTransactionLog()
    transactions.push(transaction)
    saveTransactionLog(transactions)
    
    console.log('📊 Transaction Log: Logged transaction:', transaction.transactionId)
  }

  /**
   * Update transaction status
   */
  static updateTransactionStatus(transactionId: string, status: 'pending' | 'completed' | 'failed' | 'cancelled'): void {
    const transactions = getCurrentTransactionLog()
    const transaction = transactions.find(t => t.transactionId === transactionId)
    
    if (transaction) {
      transaction.status = status
      transaction.lastUpdated = new Date().toISOString()
      saveTransactionLog(transactions)
      console.log('📊 Transaction Log: Updated transaction status:', { transactionId, status })
    }
  }

  /**
   * Get transactions for a user
   */
  static getTransactionsForUser(userId: string, limit: number = 50): Transaction[] {
    const transactions = getCurrentTransactionLog()
    return transactions
      .filter(t => t.fromUserId === userId || t.toUserId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get all transactions (for admin)
   */
  static getAllTransactions(limit: number = 100): Transaction[] {
    const transactions = getCurrentTransactionLog()
    return transactions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /**
   * Get pending allocations for an employee
   */
  static getPendingAllocations(employeeId: string): BudgetAllocation[] {
    const balance = this.getEmployeeBalance(employeeId)
    return balance.pendingAllocations
  }

  /**
   * Get debug info
   */
  static getDebugInfo(): {
    totalEmployees: number;
    totalBalance: number;
    totalTransactions: number;
    filePaths: { balances: string; transactions: string };
    filesExist: { balances: boolean; transactions: boolean };
  } {
    const balances = getCurrentEmployeeBalances()
    const transactions = getCurrentTransactionLog()
    
    let totalBalance = 0
    for (const [_, balance] of balances) {
      totalBalance += balance.balance || 0
    }

    return {
      totalEmployees: balances.size,
      totalBalance,
      totalTransactions: transactions.length,
      filePaths: {
        balances: EMPLOYEE_BALANCE_FILE_PATH,
        transactions: TRANSACTION_LOG_FILE_PATH
      },
      filesExist: {
        balances: fs.existsSync(EMPLOYEE_BALANCE_FILE_PATH),
        transactions: fs.existsSync(TRANSACTION_LOG_FILE_PATH)
      }
    }
  }
} 