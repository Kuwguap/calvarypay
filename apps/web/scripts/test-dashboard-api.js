const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing Dashboard API Components...')
    
    // Test 1: Check if calvary_users table has the right data
    console.log('\n📋 Test 1: Checking calvary_users table...')
    const { data: users, error: usersError } = await supabase
      .from('calvary_users')
      .select('id, email, role, is_active')
      .eq('role', 'employee')
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log('✅ Users found:', users?.length || 0)
      console.log('   Active employees:', users?.filter(u => u.is_active).length || 0)
    }
    
    // Test 2: Check if employee_transfers table has data
    console.log('\n📋 Test 2: Checking employee_transfers table...')
    const { data: transfers, error: transfersError } = await supabase
      .from('employee_transfers')
      .select('*')
    
    if (transfersError) {
      console.error('❌ Error fetching transfers:', transfersError)
    } else {
      console.log('✅ Transfers found:', transfers?.length || 0)
      if (transfers && transfers.length > 0) {
        console.log('   Sample transfer:', {
          id: transfers[0].id,
          sender_company_id: transfers[0].sender_company_id,
          amount: transfers[0].amount_minor,
          status: transfers[0].status
        })
      }
    }
    
    // Test 3: Check if there are any transfers for the test merchant
    console.log('\n📋 Test 3: Checking transfers for test merchant...')
    const testMerchantId = '1fb6c5e8-4d64-437d-a345-58ad93dd10de'
    const { data: merchantTransfers, error: merchantTransfersError } = await supabase
      .from('employee_transfers')
      .select('*')
      .eq('sender_company_id', testMerchantId)
    
    if (merchantTransfersError) {
      console.error('❌ Error fetching merchant transfers:', merchantTransfersError)
    } else {
      console.log('✅ Merchant transfers found:', merchantTransfers?.length || 0)
      if (merchantTransfers && merchantTransfers.length > 0) {
        console.log('   First transfer:', {
          id: merchantTransfers[0].id,
          amount: merchantTransfers[0].amount_minor,
          status: merchantTransfers[0].status
        })
      }
    }
    
    // Test 4: Check balance service
    console.log('\n📋 Test 4: Checking balance service...')
    const fs = require('fs')
    const path = require('path')
    const balanceFile = path.join(process.cwd(), 'data', 'company-balances.json')
    
    if (fs.existsSync(balanceFile)) {
      const balanceData = JSON.parse(fs.readFileSync(balanceFile, 'utf8'))
      const merchantBalance = balanceData[testMerchantId]
      if (merchantBalance) {
        console.log('✅ Balance found for merchant:', {
          balance: merchantBalance.balance,
          currency: merchantBalance.currency,
          transactions: merchantBalance.transactions?.length || 0
        })
      } else {
        console.log('❌ No balance found for merchant:', testMerchantId)
      }
    } else {
      console.log('❌ Balance file not found')
    }
    
    console.log('\n🎯 Summary:')
    console.log(`   - Users: ${users?.length || 0}`)
    console.log(`   - Total Transfers: ${transfers?.length || 0}`)
    console.log(`   - Merchant Transfers: ${merchantTransfers?.length || 0}`)
    console.log(`   - Merchant Balance: ${merchantBalance?.balance || 0} ${merchantBalance?.currency || 'N/A'}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testDashboardAPI()
  .then(() => {
    console.log('\n🏁 Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Test failed:', error)
    process.exit(1)
  }) 