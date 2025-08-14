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

async function checkAndAddColumns() {
  try {
    console.log('🔍 Checking current table structure...')
    
    // First, let's see what columns currently exist
    const { data: sampleData, error: sampleError } = await supabase
      .from('calvary_users')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      console.error('❌ Cannot access calvary_users table:', sampleError)
      return
    }
    
    if (sampleData && sampleData.length > 0) {
      const currentColumns = Object.keys(sampleData[0])
      console.log('📋 Current table columns:', currentColumns)
      
      // Check which columns are missing
      const requiredColumns = ['company_id', 'status', 'department', 'spending_limit_minor', 'last_login', 'metadata']
      const missingColumns = requiredColumns.filter(col => !currentColumns.includes(col))
      
      if (missingColumns.length === 0) {
        console.log('✅ All required columns already exist!')
        return
      }
      
      console.log('❌ Missing columns:', missingColumns)
      console.log('⚠️  Since exec_sql is not available, you need to manually add these columns in the Supabase SQL Editor:')
      console.log('')
      console.log('Run this SQL in your Supabase SQL Editor:')
      console.log('')
      console.log('-- Add missing columns to calvary_users table')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES calvary_users(id) ON DELETE SET NULL;')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\' CHECK (status IN (\'active\', \'inactive\', \'suspended\', \'pending\'));')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT \'General\';')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS spending_limit_minor INTEGER DEFAULT 0;')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;')
      console.log('ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';')
      console.log('')
      console.log('-- Update existing users to have proper status')
      console.log('UPDATE calvary_users SET status = CASE WHEN is_active = true THEN \'active\' ELSE \'inactive\' END WHERE status IS NULL;')
      console.log('')
      console.log('-- Create indexes for better performance')
      console.log('CREATE INDEX IF NOT EXISTS idx_calvary_users_company_id ON calvary_users(company_id);')
      console.log('CREATE INDEX IF NOT EXISTS idx_calvary_users_status ON calvary_users(status);')
      console.log('CREATE INDEX IF NOT EXISTS idx_calvary_users_department ON calvary_users(department);')
      console.log('CREATE INDEX IF NOT EXISTS idx_calvary_users_last_login ON calvary_users(last_login);')
      
    } else {
      console.log('⚠️  No data found in calvary_users table')
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error)
  }
}

// Run the check
checkAndAddColumns()
  .then(() => {
    console.log('🏁 Column check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Column check failed:', error)
    process.exit(1)
  }) 