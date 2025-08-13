/**
 * Balance Migration Script
 * Migrates existing file-based balance data to the new database structure
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MIGRATION_CONFIG = {
  dataDir: path.join(__dirname, '../apps/web/data'),
  files: {
    companyBalances: 'company-balances.json',
    employeeBalances: 'employee-balances.json',
    transactionLog: 'transaction-log.json'
  }
};

// Database configuration (you'll need to set these environment variables)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return null;
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Convert major currency units to minor units (e.g., GHS to pesewas)
 */
function toMinorUnits(amount, currency = 'GHS') {
  const multipliers = {
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
function toMajorUnits(amount, currency = 'GHS') {
  const divisors = {
    'GHS': 100,
    'NGN': 100,
    'USD': 100,
    'EUR': 100
  };
  
  return amount / (divisors[currency] || 100);
}

/**
 * Migrate company balances
 */
async function migrateCompanyBalances(companyData) {
  console.log('🔄 Migrating company balances...');
  
  let migratedCount = 0;
  const errors = [];
  
  for (const [companyId, balanceData] of Object.entries(companyData)) {
    try {
      console.log(`   Processing company: ${companyId}`);
      
      // Insert or update company balance
      const { data: companyBalance, error: balanceError } = await supabase
        .from('balance_schema.company_balances')
        .upsert({
          company_id: companyId,
          balance_minor: toMinorUnits(balanceData.balance || 0, balanceData.currency),
          currency: balanceData.currency || 'GHS',
          total_deposits_minor: toMinorUnits(balanceData.totalDeposits || 0, balanceData.currency),
          total_withdrawals_minor: toMinorUnits(balanceData.totalWithdrawals || 0, balanceData.currency),
          total_allocations_minor: 0, // Will be calculated from transactions
          last_updated: balanceData.lastUpdated || new Date().toISOString()
        }, {
          onConflict: 'company_id'
        });
      
      if (balanceError) {
        throw new Error(`Balance update failed: ${balanceError.message}`);
      }
      
      // Migrate transactions if they exist
      if (balanceData.transactions && Array.isArray(balanceData.transactions)) {
        console.log(`     Migrating ${balanceData.transactions.length} transactions...`);
        
        for (const transaction of balanceData.transactions) {
          const transactionType = transaction.type === 'credit' ? 'deposit' : 'withdrawal';
          
          const { error: transactionError } = await supabase
            .from('balance_schema.balance_transactions')
            .insert({
              transaction_reference: transaction.reference || transaction.id,
              entity_id: companyId,
              entity_type: 'company',
              transaction_type: transactionType,
              amount_minor: toMinorUnits(transaction.amount || 0, transaction.currency || balanceData.currency),
              currency: transaction.currency || balanceData.currency || 'GHS',
              previous_balance_minor: 0, // Not available in file data
              new_balance_minor: toMinorUnits(transaction.amount || 0, transaction.currency || balanceData.currency),
              net_amount_minor: toMinorUnits(transaction.amount || 0, transaction.currency || balanceData.currency),
              purpose: transaction.purpose || 'Transaction migrated from file',
              description: transaction.description || `${transactionType} transaction migrated from file data`,
              processed_at: transaction.timestamp || new Date().toISOString()
            });
          
          if (transactionError) {
            console.warn(`     ⚠️  Transaction migration warning: ${transactionError.message}`);
          }
        }
      }
      
      migratedCount++;
      console.log(`   ✅ Company ${companyId} migrated successfully`);
      
    } catch (error) {
      console.error(`   ❌ Error migrating company ${companyId}:`, error.message);
      errors.push({ companyId, error: error.message });
    }
  }
  
  return { migratedCount, errors };
}

/**
 * Migrate employee balances
 */
async function migrateEmployeeBalances(employeeData) {
  console.log('🔄 Migrating employee balances...');
  
  let migratedCount = 0;
  const errors = [];
  
  for (const [employeeId, balanceData] of Object.entries(employeeData)) {
    try {
      console.log(`   Processing employee: ${employeeId}`);
      
      // Insert or update employee balance
      const { data: employeeBalance, error: balanceError } = await supabase
        .from('balance_schema.employee_balances')
        .upsert({
          employee_id: employeeId,
          company_id: balanceData.companyId || null,
          balance_minor: toMinorUnits(balanceData.balance || 0, balanceData.currency),
          currency: balanceData.currency || 'GHS',
          total_received_minor: toMinorUnits(balanceData.totalReceived || 0, balanceData.currency),
          total_sent_minor: toMinorUnits(balanceData.totalSent || 0, balanceData.currency),
          total_allocations_minor: toMinorUnits(balanceData.totalAllocations || 0, balanceData.currency),
          last_updated: balanceData.lastUpdated || new Date().toISOString()
        }, {
          onConflict: 'employee_id'
        });
      
      if (balanceError) {
        throw new Error(`Balance update failed: ${balanceError.message}`);
      }
      
      // Migrate allocations if they exist
      if (balanceData.allocations && Array.isArray(balanceData.allocations)) {
        console.log(`     Migrating ${balanceData.allocations.length} allocations...`);
        
        for (const allocation of balanceData.allocations) {
          const { error: allocationError } = await supabase
            .from('balance_schema.budget_allocations')
            .insert({
              allocation_reference: allocation.allocationId || allocation.reference,
              employee_id: employeeId,
              company_id: allocation.companyId || balanceData.companyId,
              amount_minor: toMinorUnits(allocation.amount || 0, allocation.currency),
              currency: allocation.currency || 'GHS',
              budget_type: allocation.budgetType || 'general',
              description: allocation.description || 'Budget allocation migrated from file',
              status: allocation.status || 'accepted',
              allocated_by: allocation.allocatedBy || allocation.companyId || balanceData.companyId,
              allocated_at: allocation.timestamp || new Date().toISOString(),
              accepted_at: allocation.status === 'accepted' ? (allocation.timestamp || new Date().toISOString()) : null
            });
          
          if (allocationError) {
            console.warn(`     ⚠️  Allocation migration warning: ${allocationError.message}`);
          }
        }
      }
      
      // Migrate transactions if they exist
      if (balanceData.transactions && Array.isArray(balanceData.transactions)) {
        console.log(`     Migrating ${balanceData.transactions.length} transactions...`);
        
        for (const transaction of balanceData.transactions) {
          const transactionType = transaction.type === 'credit' ? 'budget_credit' : 'budget_debit';
          
          const { error: transactionError } = await supabase
            .from('balance_schema.balance_transactions')
            .insert({
              transaction_reference: transaction.reference || transaction.id,
              entity_id: employeeId,
              entity_type: 'employee',
              transaction_type: transactionType,
              amount_minor: toMinorUnits(transaction.amount || 0, transaction.currency),
              currency: transaction.currency || 'GHS',
              previous_balance_minor: 0, // Not available in file data
              new_balance_minor: toMinorUnits(transaction.amount || 0, transaction.currency),
              net_amount_minor: toMinorUnits(transaction.amount || 0, transaction.currency),
              purpose: 'Transaction migrated from file',
              description: transaction.description || 'Transaction migrated from file data',
              processed_at: transaction.timestamp || new Date().toISOString()
            });
          
          if (transactionError) {
            console.warn(`     ⚠️  Transaction migration warning: ${transactionError.message}`);
          }
        }
      }
      
      migratedCount++;
      console.log(`   ✅ Employee ${employeeId} migrated successfully`);
      
    } catch (error) {
      console.error(`   ❌ Error migrating employee ${employeeId}:`, error.message);
      errors.push({ employeeId, error: error.message });
    }
  }
  
  return { migratedCount, errors };
}

/**
 * Verify migration success
 */
async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  try {
    // Check company balances
    const { data: companyCount, error: companyError } = await supabase
      .from('balance_schema.company_balances')
      .select('*', { count: 'exact', head: true });
    
    if (companyError) {
      console.error('❌ Error checking company balances:', companyError.message);
      return false;
    }
    
    // Check employee balances
    const { data: employeeCount, error: employeeError } = await supabase
      .from('balance_schema.employee_balances')
      .select('*', { count: 'exact', head: true });
    
    if (employeeError) {
      console.error('❌ Error checking employee balances:', employeeError.message);
      return false;
    }
    
    // Check transactions
    const { data: transactionCount, error: transactionError } = await supabase
      .from('balance_schema.balance_transactions')
      .select('*', { count: 'exact', head: true });
    
    if (transactionError) {
      console.error('❌ Error checking transactions:', transactionError.message);
      return false;
    }
    
    console.log('📊 Migration verification results:');
    console.log(`   Company balances: ${companyCount || 0}`);
    console.log(`   Employee balances: ${employeeCount || 0}`);
    console.log(`   Transactions: ${transactionCount || 0}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting balance data migration...');
  console.log('=====================================');
  
  try {
    // Read company balances
    const companyBalancesPath = path.join(MIGRATION_CONFIG.dataDir, MIGRATION_CONFIG.files.companyBalances);
    const companyData = readJsonFile(companyBalancesPath);
    
    if (!companyData) {
      console.log('⚠️  No company balance data found, skipping...');
    } else {
      const companyResult = await migrateCompanyBalances(companyData);
      console.log(`✅ Company balances migration completed: ${companyResult.migratedCount} migrated`);
      if (companyResult.errors.length > 0) {
        console.log(`⚠️  ${companyResult.errors.length} errors occurred during company migration`);
      }
    }
    
    // Read employee balances
    const employeeBalancesPath = path.join(MIGRATION_CONFIG.dataDir, MIGRATION_CONFIG.files.employeeBalances);
    const employeeData = readJsonFile(employeeBalancesPath);
    
    if (!employeeData) {
      console.log('⚠️  No employee balance data found, skipping...');
    } else {
      const employeeResult = await migrateEmployeeBalances(employeeData);
      console.log(`✅ Employee balances migration completed: ${employeeResult.migratedCount} migrated`);
      if (employeeResult.errors.length > 0) {
        console.log(`⚠️  ${employeeResult.errors.length} errors occurred during employee migration`);
      }
    }
    
    // Verify migration
    const verificationSuccess = await verifyMigration();
    
    if (verificationSuccess) {
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test the new database-based balance system');
      console.log('2. Update your application code to use the new database tables');
      console.log('3. Once verified working, you can archive the old JSON files');
    } else {
      console.log('⚠️  Migration completed but verification failed. Please check the data manually.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Rollback function (removes all migrated data)
 */
async function rollbackMigration() {
  console.log('🔄 Rolling back migration...');
  console.log('⚠️  This will remove ALL migrated data!');
  
  try {
    // Delete all migrated data in reverse order
    const { error: historyError } = await supabase
      .from('balance_schema.balance_history')
      .delete()
      .neq('id', 0);
    
    if (historyError) {
      console.error('❌ Error deleting balance history:', historyError.message);
    }
    
    const { error: allocationError } = await supabase
      .from('balance_schema.budget_allocations')
      .delete()
      .neq('id', 0);
    
    if (allocationError) {
      console.error('❌ Error deleting budget allocations:', allocationError.message);
    }
    
    const { error: transactionError } = await supabase
      .from('balance_schema.balance_transactions')
      .delete()
      .neq('id', 0);
    
    if (transactionError) {
      console.error('❌ Error deleting balance transactions:', transactionError.message);
    }
    
    const { error: employeeError } = await supabase
      .from('balance_schema.employee_balances')
      .delete()
      .neq('id', 0);
    
    if (employeeError) {
      console.error('❌ Error deleting employee balances:', employeeError.message);
    }
    
    const { error: companyError } = await supabase
      .from('balance_schema.company_balances')
      .delete()
      .neq('id', 0);
    
    if (companyError) {
      console.error('❌ Error deleting company balances:', companyError.message);
    }
    
    console.log('✅ Rollback completed successfully');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
  }
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'migrate':
    runMigration();
    break;
  case 'verify':
    verifyMigration();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  default:
    console.log('Balance Migration Script');
    console.log('=======================');
    console.log('');
    console.log('Usage:');
    console.log('  node migrate-balances.js migrate   - Run the migration');
    console.log('  node migrate-balances.js verify    - Verify migration success');
    console.log('  node migrate-balances.js rollback  - Rollback migration (removes all data)');
    console.log('');
    console.log('Environment variables required:');
    console.log('  SUPABASE_URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY');
    console.log('');
    console.log('⚠️  Make sure to run the database migration (004_balance_system.sql) first!');
    break;
} 