"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, TrendingUp, TrendingDown, ArrowRight, ArrowLeft, Activity } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Transaction {
  id: string
  reference: string
  type: string
  amount: number
  currency: string
  isIncoming: boolean
  sender: { name: string; email: string; role?: string } | null
  recipient: { name: string; email: string; role?: string } | null
  reason: string
  description: string
  status: string
  timestamp: string
  processedAt: string | null
}

export default function TransactionHistory() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const limit = 10

  const fetchTransactions = async (newOffset = 0) => {
    if (!user?.accessToken) return

    try {
      setLoading(true)
      const response = await fetch(`/api/employee/transactions?limit=${limit}&offset=${newOffset}`, {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setHasMore(data.hasMore || false)
      setOffset(newOffset)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [user?.accessToken])

  const handleRefresh = () => {
    fetchTransactions(0)
  }

  const handleLoadMore = () => {
    fetchTransactions(offset + limit)
  }

  const handlePrevious = () => {
    fetchTransactions(Math.max(0, offset - limit))
  }

  const getTransactionIcon = (type: string, isIncoming: boolean) => {
    if (type === 'transfer_sent' || type === 'transfer_received') {
      return isIncoming ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />
    }
    if (type === 'deposit') return <TrendingUp className="w-4 h-4 text-blue-400" />
    if (type === 'withdrawal') return <TrendingDown className="w-4 h-4 text-orange-400" />
    return <Activity className="w-4 h-4 text-gray-400" />
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer_sent': return 'Transfer Sent'
      case 'transfer_received': return 'Transfer Received'
      case 'deposit': return 'Deposit'
      case 'withdrawal': return 'Withdrawal'
      case 'budget_allocation': return 'Budget Allocated'
      case 'budget_spent': return 'Budget Spent'
      default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-4 w-[100px]" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 mb-4">No transactions found</p>
        <p className="text-slate-500 text-sm">Your transaction history will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Showing {offset + 1}-{offset + transactions.length} transactions
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-slate-700 rounded-full">
                    {getTransactionIcon(transaction.type, transaction.isIncoming)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-white">
                        {getTransactionTypeLabel(transaction.type)}
                      </h4>
                      <Badge className={getStatusColor(transaction.status)}>
                        {transaction.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      {transaction.description || transaction.reason}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>Ref: {transaction.reference}</span>
                      <span>{new Date(transaction.timestamp).toLocaleDateString()}</span>
                      <span>{new Date(transaction.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${transaction.isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                    {transaction.isIncoming ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                  </div>
                  <p className="text-xs text-slate-500">
                    {transaction.currency}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              {(transaction.sender || transaction.recipient) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {transaction.sender && (
                      <div className="flex items-center space-x-1">
                        <span>From:</span>
                        <span className="text-white">{transaction.sender.name}</span>
                        {transaction.sender.role && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.sender.role}
                          </Badge>
                        )}
                      </div>
                    )}
                    {transaction.sender && transaction.recipient && (
                      <ArrowRight className="w-3 h-3" />
                    )}
                    {transaction.recipient && (
                      <div className="flex items-center space-x-1">
                        <span>To:</span>
                        <span className="text-white">{transaction.recipient.name}</span>
                        {transaction.recipient.role && (
                          <Badge variant="outline" className="text-xs">
                            {transaction.recipient.role}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <Button
          onClick={handlePrevious}
          disabled={offset === 0}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        <span className="text-sm text-slate-400">
          Page {Math.floor(offset / limit) + 1}
        </span>
        
        <Button
          onClick={handleLoadMore}
          disabled={!hasMore}
          variant="outline"
          size="sm"
        >
          Next
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
} 