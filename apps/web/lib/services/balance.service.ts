/**
 * Balance Service for CalvaryPay
 * Provides centralized balance management for companies
 */

import fs from 'fs'
import path from 'path'

// File path for persistent balance storage
const BALANCE_FILE_PATH = path.join(process.cwd(), 'data', 'company-balances.json')

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(BALANCE_FILE_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
    console.log('💰 Balance Service: Created data directory:', dataDir)
  }
}

// Load balances from file
const loadBalances = (): Map<string, any> => {
  try {
    ensureDataDirectory()
    if (fs.existsSync(BALANCE_FILE_PATH)) {
      const data = fs.readFileSync(BALANCE_FILE_PATH, 'utf8')
      const balances = JSON.parse(data)
      const balanceMap = new Map(Object.entries(balances))
      console.log('💰 Balance Service: Loaded balances from file:', {
        filePath: BALANCE_FILE_PATH,
        balanceCount: balanceMap.size,
        companies: Array.from(balanceMap.keys())
      })
      return balanceMap
    } else {
      console.log('💰 Balance Service: No balance file found, starting with empty balances')
    }
  } catch (error) {
    console.error('💰 Balance Service: Error loading balances from file:', error)
  }
  return new Map()
}

// Save balances to file
const saveBalances = (balances: Map<string, any>) => {
  try {
    ensureDataDirectory()
    const data = Object.fromEntries(balances)
    fs.writeFileSync(BALANCE_FILE_PATH, JSON.stringify(data, null, 2))
    console.log('💰 Balance Service: Saved balances to file:', {
      filePath: BALANCE_FILE_PATH,
      balanceCount: balances.size,
      companies: Array.from(balances.keys())
    })
  } catch (error) {
    console.error('💰 Balance Service: Error saving balances to file:', error)
  }
}

// In-memory cache with file persistence - reload on each access
let companyBalances: Map<string, any> | null = null

// Get current balances (reload from file if needed)
const getCurrentBalances = (): Map<string, any> => {
  if (!companyBalances) {
    console.log('💰 Balance Service: Loading balances for the first time')
    companyBalances = loadBalances()
  }
  return companyBalances
}

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
}

export class BalanceService {
  /**
   * Get current balance for a company
   */
  static getBalance(companyId: string): CompanyBalance {
    const balances = getCurrentBalances()
    const balanceData = balances.get(companyId) || {
      balance: 0,
      currency: 'GHS',
      lastUpdated: new Date().toISOString(),
      transactions: []
    }

    console.log('💰 Balance Service: Getting balance for company:', companyId, balanceData)

    const totalDeposits = balanceData.transactions
      .filter((t: any) => t.type === 'credit')
      .reduce((sum: number, t: any) => sum + t.amount, 0)

    const totalWithdrawals = balanceData.transactions
      .filter((t: any) => t.type === 'debit')
      .reduce((sum: number, t: any) => sum + t.amount, 0)

    return {
      companyId,
      balance: balanceData.balance,
      currency: balanceData.currency,
      lastUpdated: balanceData.lastUpdated,
      totalDeposits,
      totalWithdrawals
    }
  }

  /**
   * Update balance for a company
   */
  static updateBalance(
    companyId: string,
    amount: number,
    currency: string,
    reference: string,
    purpose: string,
    type: 'credit' | 'debit' = 'credit'
  ): BalanceUpdate {
    console.log('💰 Balance Service: Starting balance update for company:', companyId, {
      amount,
      currency,
      reference,
      purpose,
      type
    })

    const balances = getCurrentBalances()
    const currentData = balances.get(companyId) || {
      balance: 0,
      currency: currency.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      transactions: []
    }

    console.log('💰 Balance Service: Current balance data:', currentData)

    const previousBalance = currentData.balance
    const newBalance = type === 'credit' 
      ? previousBalance + amount 
      : previousBalance - amount

    // Add transaction record
    const transaction = {
      id: reference,
      amount,
      type,
      reference,
      purpose,
      timestamp: new Date().toISOString()
    }

    // Update balance data
    const updatedData = {
      balance: newBalance,
      currency: currency.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      transactions: [...currentData.transactions, transaction]
    }

    balances.set(companyId, updatedData)
    
    // Persist to file
    saveBalances(balances)

    console.log(`💰 Balance Service: Updated balance for company ${companyId}:`, {
      previousBalance,
      newBalance,
      amount,
      currency,
      reference,
      purpose,
      type
    })

    return {
      companyId,
      previousBalance,
      newBalance,
      amount,
      currency,
      reference,
      purpose,
      timestamp: new Date().toISOString(),
      type
    }
  }

  /**
   * Get all balances (for admin purposes)
   */
  static getAllBalances(): Map<string, CompanyBalance> {
    const balances = getCurrentBalances()
    const allBalances = new Map<string, CompanyBalance>()
    
    for (const [companyId] of balances) {
      allBalances.set(companyId, this.getBalance(companyId))
    }

    return allBalances
  }

  /**
   * Reset balance for a company (for testing purposes)
   */
  static resetBalance(companyId: string): void {
    const balances = getCurrentBalances()
    balances.delete(companyId)
    saveBalances(balances)
    console.log(`💰 Balance Service: Reset balance for company ${companyId}`)
  }

  /**
   * Get balance statistics
   */
  static getStats(): {
    totalCompanies: number;
    totalBalance: number;
    averageBalance: number;
  } {
    const balances = getCurrentBalances()
    const companies = Array.from(balances.keys())
    const totalBalance = companies.reduce((sum, companyId) => {
      return sum + this.getBalance(companyId).balance
    }, 0)

    return {
      totalCompanies: companies.length,
      totalBalance,
      averageBalance: companies.length > 0 ? totalBalance / companies.length : 0
    }
  }

  /**
   * Reload balances from file (useful for testing)
   */
  static reloadBalances(): void {
    console.log('💰 Balance Service: Manually reloading balances from file')
    companyBalances = loadBalances()
    console.log('💰 Balance Service: Reloaded balances from file')
  }

  /**
   * Get debug info
   */
  static getDebugInfo(): {
    totalCompanies: number;
    balances: Record<string, any>;
    filePath: string;
    fileExists: boolean;
  } {
    const balances = getCurrentBalances()
    return {
      totalCompanies: balances.size,
      balances: Object.fromEntries(balances),
      filePath: BALANCE_FILE_PATH,
      fileExists: fs.existsSync(BALANCE_FILE_PATH)
    }
  }
} 