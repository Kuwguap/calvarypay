# 🚀 Balance System Migration Guide

This guide explains how to migrate from the current file-based balance system to a robust, database-driven balance management system.

## 📋 Overview

The current system stores balances in JSON files (`data/company-balances.json`, `data/employee-balances.json`, `data/transaction-log.json`). The new system uses proper database tables with:

- **Atomic transactions** for balance updates
- **Full audit trail** of all balance changes
- **Proper data relationships** and constraints
- **Scalable architecture** for production use

## 🗄️ New Database Schema

### Tables Created

1. **`balance_schema.company_balances`** - Company/merchant account balances
2. **`balance_schema.employee_balances`** - Employee account balances
3. **`balance_schema.balance_transactions`** - All financial transactions
4. **`balance_schema.budget_allocations`** - Budget allocations from companies to employees
5. **`balance_schema.balance_history`** - Historical balance changes for auditing

### Key Features

- **Currency support**: GHS (default), NGN, USD, EUR
- **Minor unit precision**: All amounts stored in minor units (pesewas, kobo, cents)
- **Transaction types**: deposit, withdrawal, allocation, transfer_sent, transfer_received, etc.
- **Audit logging**: Complete history of all balance changes
- **Data integrity**: Constraints ensure data consistency

## 🔄 Migration Process

### Step 1: Prepare Environment

Ensure you have the required environment variables:

```bash
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Step 2: Run Database Migrations

```bash
cd database
node run-migrations.js run
```

This will:
- Create the new database schema
- Set up all tables and functions
- Create indexes for performance
- Set up triggers for automatic updates

### Step 3: Migrate Existing Data

```bash
cd database
node migrate-balances.js migrate
```

This will:
- Read existing JSON files
- Convert data to the new format
- Insert data into database tables
- Preserve all transaction history

### Step 4: Verify Migration

```bash
cd database
node run-migrations.js status
```

Check that all tables have the expected record counts.

## 🛠️ New Services

### CompanyBalanceService

```typescript
import { CompanyBalanceService } from '@/lib/services/database-balance.service';

// Get company balance
const balance = await CompanyBalanceService.getBalance(companyId);

// Update balance (deposit, withdrawal, allocation)
const newBalance = await CompanyBalanceService.updateBalance(
  companyId,
  amount,
  'deposit',
  reference,
  purpose
);

// Get balance with recent transactions
const { balance, transactions } = await CompanyBalanceService.getBalanceWithTransactions(
  companyId,
  10 // limit
);
```

### EmployeeBalanceService

```typescript
import { EmployeeBalanceService } from '@/lib/services/database-balance.service';

// Get employee balance
const balance = await EmployeeBalanceService.getBalance(employeeId);

// Update balance
const newBalance = await EmployeeBalanceService.updateBalance(
  employeeId,
  amount,
  'budget_credit',
  reference,
  description
);

// Create budget allocation
const allocation = await EmployeeBalanceService.createBudgetAllocation(
  employeeId,
  companyId,
  amount,
  budgetType,
  description
);

// Accept/reject allocation
const updatedAllocation = await EmployeeBalanceService.updateAllocationStatus(
  allocationReference,
  'accepted',
  employeeId
);
```

### TransactionService

```typescript
import { TransactionService } from '@/lib/services/database-balance.service';

// Get transaction history
const { transactions, total } = await TransactionService.getTransactionHistory(
  entityId,
  'company', // or 'employee'
  50, // limit
  0   // offset
);

// Get balance history
const { history, total } = await TransactionService.getBalanceHistory(
  entityId,
  'company', // or 'employee'
  50, // limit
  0   // offset
);
```

## 🔧 Database Functions

The migration creates several database functions for atomic operations:

### `balance_schema.update_company_balance()`

Updates company balance and logs transaction atomically.

### `balance_schema.update_employee_balance()`

Updates employee balance and logs transaction atomically.

### `balance_schema.get_company_balance_with_transactions()`

Retrieves company balance with recent transactions.

### `balance_schema.get_employee_balance_with_transactions()`

Retrieves employee balance with recent transactions and allocations.

## 📊 Data Conversion

### Currency Conversion

- **File format**: Amounts in major units (e.g., 100 GHS)
- **Database format**: Amounts in minor units (e.g., 10000 pesewas)
- **Conversion factor**: 1 GHS = 100 pesewas

### Transaction Mapping

| File Type | Database Type | Description |
|-----------|---------------|-------------|
| `credit` | `deposit` | Money received |
| `debit` | `withdrawal` | Money sent |
| `credit` | `budget_credit` | Budget allocation received |
| `debit` | `budget_debit` | Budget allocation spent |

## 🚨 Important Notes

### 1. Backup Your Data

Before running migrations, backup your existing JSON files:

```bash
cp -r apps/web/data apps/web/data-backup-$(date +%Y%m%d)
```

### 2. Test in Development First

Always test migrations in a development environment before running in production.

### 3. Update Application Code

After migration, update your application to use the new services:

```typescript
// OLD (file-based)
import { BalanceService } from '@/lib/services/balance.service';
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service';

// NEW (database-based)
import { CompanyBalanceService, EmployeeBalanceService } from '@/lib/services/database-balance.service';
```

### 4. Remove Old Files

Once migration is verified working, you can remove the old JSON files:

```bash
rm apps/web/data/company-balances.json
rm apps/web/data/employee-balances.json
rm apps/web/data/transaction-log.json
```

## 🔍 Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure you have the service role key with proper permissions
2. **Schema Already Exists**: Use `node run-migrations.js status` to check current state
3. **Data Migration Failed**: Check the migration logs and verify JSON file format

### Rollback

If something goes wrong, you can rollback:

```bash
cd database
node run-migrations.js rollback
```

**⚠️ Warning**: This removes ALL migrated data!

### Verification

Check migration status anytime:

```bash
cd database
node run-migrations.js status
```

## 📈 Performance Benefits

### Before (File-based)
- ❌ No concurrent access support
- ❌ Risk of data corruption
- ❌ Limited scalability
- ❌ No transaction rollback
- ❌ Manual data management

### After (Database-based)
- ✅ ACID compliance
- ✅ Concurrent access support
- ✅ Automatic data integrity
- ✅ Transaction rollback support
- ✅ Built-in indexing and optimization
- ✅ Scalable architecture

## 🔮 Future Enhancements

With the new database system, you can easily add:

- **Real-time balance updates** using database triggers
- **Advanced analytics** with SQL queries
- **Multi-currency support** with exchange rates
- **Automated reconciliation** with external systems
- **Audit reporting** for compliance
- **API rate limiting** and caching

## 📞 Support

If you encounter issues during migration:

1. Check the migration logs for specific error messages
2. Verify your environment variables are correct
3. Ensure you have proper database permissions
4. Test with a small dataset first

## 🎯 Next Steps

After successful migration:

1. **Update API endpoints** to use new services
2. **Test all balance operations** thoroughly
3. **Monitor database performance** and add indexes if needed
4. **Implement caching** for frequently accessed balances
5. **Add monitoring** and alerting for balance operations

---

**🎉 Congratulations!** You now have a production-ready balance management system that can scale with your business needs. 