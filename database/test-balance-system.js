/**
 * Test Script for New Balance System
 * Verifies that the database-based balance system works correctly
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
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

// Test data
const TEST_COMPANY_ID = '1fb6c5e8-4d64-437d-a345-58ad93dd10de';
const TEST_EMPLOYEE_ID = 'ff0d6f6f-3f2c-4c91-8c4a-e8d186d20718';

/**
 * Test company balance operations
 */
async function testCompanyBalances() {
  console.log('🧪 Testing Company Balance Operations...');
  
  try {
    // Test 1: Get balance
    console.log('   Test 1: Get company balance');
    const { data: balance, error: balanceError } = await supabase
      .from('balance_schema.company_balances')
      .select('*')
      .eq('company_id', TEST_COMPANY_ID)
      .single();
    
    if (balanceError) {
      console.log(`     ❌ Failed: ${balanceError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: Balance ${balance.balance_minor / 100} ${balance.currency}`);
    
    // Test 2: Test database function
    console.log('   Test 2: Test update_company_balance function');
    const { data: functionResult, error: functionError } = await supabase.rpc(
      'balance_schema.update_company_balance',
      {
        p_company_id: TEST_COMPANY_ID,
        p_amount_minor: 1000, // 10 GHS
        p_transaction_type: 'deposit',
        p_reference: `test_${Date.now()}`,
        p_purpose: 'Test deposit'
      }
    );
    
    if (functionError) {
      console.log(`     ❌ Failed: ${functionError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: New balance ${functionResult.balance_minor / 100} ${functionResult.currency}`);
    
    // Test 3: Check transactions were created
    console.log('   Test 3: Check transactions were created');
    const { data: transactions, error: transError } = await supabase
      .from('balance_schema.balance_transactions')
      .select('*')
      .eq('entity_id', TEST_COMPANY_ID)
      .eq('entity_type', 'company')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (transError) {
      console.log(`     ❌ Failed: ${transError.message}`);
      return false;
    }
    
    if (transactions && transactions.length > 0) {
      console.log(`     ✅ Success: Transaction created with reference ${transactions[0].transaction_reference}`);
    } else {
      console.log('     ❌ Failed: No transaction found');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('     ❌ Test failed with exception:', error.message);
    return false;
  }
}

/**
 * Test employee balance operations
 */
async function testEmployeeBalances() {
  console.log('🧪 Testing Employee Balance Operations...');
  
  try {
    // Test 1: Get balance
    console.log('   Test 1: Get employee balance');
    const { data: balance, error: balanceError } = await supabase
      .from('balance_schema.employee_balances')
      .select('*')
      .eq('employee_id', TEST_EMPLOYEE_ID)
      .single();
    
    if (balanceError) {
      console.log(`     ❌ Failed: ${balanceError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: Balance ${balance.balance_minor / 100} ${balance.currency}`);
    
    // Test 2: Test database function
    console.log('   Test 2: Test update_employee_balance function');
    const { data: functionResult, error: functionError } = await supabase.rpc(
      'balance_schema.update_employee_balance',
      {
        p_employee_id: TEST_EMPLOYEE_ID,
        p_company_id: TEST_COMPANY_ID,
        p_amount_minor: 500, // 5 GHS
        p_transaction_type: 'budget_credit',
        p_reference: `test_alloc_${Date.now()}`,
        p_description: 'Test budget allocation'
      }
    );
    
    if (functionError) {
      console.log(`     ❌ Failed: ${functionError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: New balance ${functionResult.balance_minor / 100} ${functionResult.currency}`);
    
    // Test 3: Check transactions were created
    console.log('   Test 3: Check transactions were created');
    const { data: transactions, error: transError } = await supabase
      .from('balance_schema.balance_transactions')
      .select('*')
      .eq('entity_id', TEST_EMPLOYEE_ID)
      .eq('entity_type', 'employee')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (transError) {
      console.log(`     ❌ Failed: ${transError.message}`);
      return false;
    }
    
    if (transactions && transactions.length > 0) {
      console.log(`     ✅ Success: Transaction created with reference ${transactions[0].transaction_reference}`);
    } else {
      console.log('     ❌ Failed: No transaction found');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('     ❌ Test failed with exception:', error.message);
    return false;
  }
}

/**
 * Test budget allocation operations
 */
async function testBudgetAllocations() {
  console.log('🧪 Testing Budget Allocation Operations...');
  
  try {
    // Test 1: Create budget allocation
    console.log('   Test 1: Create budget allocation');
    const allocationReference = `test_alloc_${Date.now()}`;
    
    const { data: allocation, error: allocError } = await supabase
      .from('balance_schema.budget_allocations')
      .insert({
        allocation_reference: allocationReference,
        employee_id: TEST_EMPLOYEE_ID,
        company_id: TEST_COMPANY_ID,
        amount_minor: 1000, // 10 GHS
        currency: 'GHS',
        budget_type: 'test',
        description: 'Test budget allocation',
        status: 'pending',
        allocated_by: TEST_COMPANY_ID
      })
      .select()
      .single();
    
    if (allocError) {
      console.log(`     ❌ Failed: ${allocError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: Allocation created with reference ${allocation.allocation_reference}`);
    
    // Test 2: Update allocation status
    console.log('   Test 2: Update allocation status to accepted');
    const { data: updatedAllocation, error: updateError } = await supabase
      .from('balance_schema.budget_allocations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('allocation_reference', allocationReference)
      .select()
      .single();
    
    if (updateError) {
      console.log(`     ❌ Failed: ${updateError.message}`);
      return false;
    }
    
    console.log(`     ✅ Success: Allocation status updated to ${updatedAllocation.status}`);
    
    return true;
    
  } catch (error) {
    console.error('     ❌ Test failed with exception:', error.message);
    return false;
  }
}

/**
 * Test database functions
 */
async function testDatabaseFunctions() {
  console.log('🧪 Testing Database Functions...');
  
  try {
    // Test 1: get_company_balance_with_transactions
    console.log('   Test 1: get_company_balance_with_transactions function');
    const { data: companyData, error: companyError } = await supabase.rpc(
      'balance_schema.get_company_balance_with_transactions',
      {
        p_company_id: TEST_COMPANY_ID,
        p_limit: 5
      }
    );
    
    if (companyError) {
      console.log(`     ❌ Failed: ${companyError.message}`);
      return false;
    }
    
    if (companyData && companyData.length > 0) {
      const balance = companyData[0];
      console.log(`     ✅ Success: Company balance ${balance.balance_minor / 100} ${balance.currency}`);
      console.log(`        Transactions: ${balance.recent_transactions ? balance.recent_transactions.length : 0}`);
    } else {
      console.log('     ❌ Failed: No company data returned');
      return false;
    }
    
    // Test 2: get_employee_balance_with_transactions
    console.log('   Test 2: get_employee_balance_with_transactions function');
    const { data: employeeData, error: employeeError } = await supabase.rpc(
      'balance_schema.get_employee_balance_with_transactions',
      {
        p_employee_id: TEST_EMPLOYEE_ID,
        p_limit: 5
      }
    );
    
    if (employeeError) {
      console.log(`     ❌ Failed: ${employeeError.message}`);
      return false;
    }
    
    if (employeeData && employeeData.length > 0) {
      const balance = employeeData[0];
      console.log(`     ✅ Success: Employee balance ${balance.balance_minor / 100} ${balance.currency}`);
      console.log(`        Transactions: ${balance.recent_transactions ? balance.recent_transactions.length : 0}`);
      console.log(`        Allocations: ${balance.recent_allocations ? balance.recent_allocations.length : 0}`);
    } else {
      console.log('     ❌ Failed: No employee data returned');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('     ❌ Test failed with exception:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Balance System Tests...');
  console.log('=====================================');
  
  const tests = [
    { name: 'Company Balances', fn: testCompanyBalances },
    { name: 'Employee Balances', fn: testEmployeeBalances },
    { name: 'Budget Allocations', fn: testBudgetAllocations },
    { name: 'Database Functions', fn: testDatabaseFunctions }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  for (const test of tests) {
    console.log('');
    const success = await test.fn();
    
    if (success) {
      passedTests++;
      console.log(`✅ ${test.name} test PASSED`);
    } else {
      failedTests++;
      console.log(`❌ ${test.name} test FAILED`);
    }
  }
  
  console.log('');
  console.log('=====================================');
  console.log('📊 Test Results:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📁 Total: ${tests.length}`);
  
  if (failedTests === 0) {
    console.log('');
    console.log('🎉 All tests passed! The balance system is working correctly.');
    console.log('');
    console.log('You can now:');
    console.log('1. Update your application to use the new database services');
    console.log('2. Remove the old file-based services');
    console.log('3. Archive the old JSON files');
  } else {
    console.log('');
    console.log('⚠️  Some tests failed. Please check the errors above.');
    console.log('The balance system may not be working correctly.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testCompanyBalances,
  testEmployeeBalances,
  testBudgetAllocations,
  testDatabaseFunctions,
  runAllTests
}; 