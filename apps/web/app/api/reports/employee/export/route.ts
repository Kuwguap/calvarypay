import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth.service'

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const user = await authService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Only allow employees to access this endpoint
    if (user.role !== 'employee') {
      return NextResponse.json(
        { error: { message: 'Access denied. Employee role required.' } },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const reportType = searchParams.get('type') || 'summary'
    const format = searchParams.get('format') || 'csv'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Fetch transactions for the user within the date range
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch transactions' } },
        { status: 500 }
      )
    }

    if (format === 'csv') {
      // Generate CSV content
      const csvHeaders = [
        'Reference',
        'Date',
        'Amount',
        'Currency',
        'Status',
        'Description',
        'Category',
        'Channel'
      ]

      const csvRows = transactions.map(transaction => [
        transaction.reference || '',
        new Date(transaction.created_at).toLocaleDateString(),
        transaction.amount?.toString() || '0',
        transaction.currency || 'NGN',
        transaction.status || '',
        transaction.description || '',
        transaction.metadata?.category || '',
        transaction.channel || ''
      ])

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n')

      // Log the export
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.userId,
          action: 'report_exported',
          resource_type: 'report',
          resource_id: `employee_report_${reportType}`,
          details: {
            format: 'csv',
            reportType,
            dateRange: days,
            transactionCount: transactions.length
          }
        })

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="employee-report-${days}days.csv"`
        }
      })
    }

    if (format === 'pdf') {
      // For PDF, we'll create a simple HTML report that can be converted to PDF
      // In a production environment, you might use a library like puppeteer or jsPDF
      
      // Calculate summary statistics
      const summary = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        successfulTransactions: transactions.filter(t => ['completed', 'success'].includes(t.status)).length,
        failedTransactions: transactions.filter(t => ['failed', 'error'].includes(t.status)).length,
        pendingTransactions: transactions.filter(t => t.status === 'pending').length
      }

      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Employee Transaction Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { margin-bottom: 30px; }
            .summary-item { display: inline-block; margin: 10px 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .status-success { color: green; }
            .status-failed { color: red; }
            .status-pending { color: orange; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Employee Transaction Report</h1>
            <p>Report Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
            <p>Employee: ${user.firstName} ${user.lastName} (${user.email})</p>
          </div>
          
          <div class="summary">
            <h2>Summary</h2>
            <div class="summary-item">
              <strong>Total Transactions:</strong> ${summary.totalTransactions}
            </div>
            <div class="summary-item">
              <strong>Total Amount:</strong> ₦${summary.totalAmount.toLocaleString()}
            </div>
            <div class="summary-item">
              <strong>Successful:</strong> ${summary.successfulTransactions}
            </div>
            <div class="summary-item">
              <strong>Failed:</strong> ${summary.failedTransactions}
            </div>
            <div class="summary-item">
              <strong>Pending:</strong> ${summary.pendingTransactions}
            </div>
          </div>
          
          <h2>Transaction Details</h2>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(transaction => `
                <tr>
                  <td>${transaction.reference || ''}</td>
                  <td>${new Date(transaction.created_at).toLocaleDateString()}</td>
                  <td>${transaction.currency || 'NGN'} ${(transaction.amount || 0).toLocaleString()}</td>
                  <td class="status-${transaction.status}">${transaction.status || ''}</td>
                  <td>${transaction.description || ''}</td>
                  <td>${transaction.metadata?.category || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>CalvaryPay Employee Report System</p>
          </div>
        </body>
        </html>
      `

      // Log the export
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.userId,
          action: 'report_exported',
          resource_type: 'report',
          resource_id: `employee_report_${reportType}`,
          details: {
            format: 'pdf',
            reportType,
            dateRange: days,
            transactionCount: transactions.length
          }
        })

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="employee-report-${days}days.html"`
        }
      })
    }

    return NextResponse.json(
      { error: { message: 'Unsupported format. Use csv or pdf.' } },
      { status: 400 }
    )

  } catch (error) {
    console.error('Employee report export error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
