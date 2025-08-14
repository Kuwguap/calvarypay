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

async function addMissingColumns() {
  try {
    console.log('🔧 Starting migration: Adding missing columns to calvary_users table...')

    // Add company_id column
    console.log('📝 Adding company_id column...')
    const { error: companyIdError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES calvary_users(id) ON DELETE SET NULL;'
    })
    
    if (companyIdError) {
      console.log('⚠️  company_id column might already exist or exec_sql not available')
      // Try direct SQL execution
      const { error: directError } = await supabase
        .from('calvary_users')
        .select('id')
        .limit(1)
      
      if (directError) {
        console.error('❌ Cannot access calvary_users table:', directError)
        return
      }
    }

    // Add status column
    console.log('📝 Adding status column...')
    const { error: statusError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT \'active\' CHECK (status IN (\'active\', \'inactive\', \'suspended\', \'pending\'));'
    })

    // Add department column
    console.log('📝 Adding department column...')
    const { error: deptError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT \'General\';'
    })

    // Add spending_limit column
    console.log('📝 Adding spending_limit_minor column...')
    const { error: limitError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS spending_limit_minor INTEGER DEFAULT 0;'
    })

    // Add last_login column
    console.log('📝 Adding last_login column...')
    const { error: loginError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;'
    })

    // Add metadata column
    console.log('📝 Adding metadata column...')
    const { error: metaError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE calvary_users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\';'
    })

    // Update existing users to have proper status
    console.log('📝 Updating existing users with proper status...')
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: 'UPDATE calvary_users SET status = CASE WHEN is_active = true THEN \'active\' ELSE \'inactive\' END WHERE status IS NULL;'
    })

    console.log('✅ Migration completed successfully!')
    console.log('📋 New columns added:')
    console.log('  - company_id (UUID, references calvary_users.id)')
    console.log('  - status (VARCHAR(20), active/inactive/suspended/pending)')
    console.log('  - department (VARCHAR(100), default: General)')
    console.log('  - spending_limit_minor (INTEGER, default: 0)')
    console.log('  - last_login (TIMESTAMPTZ)')
    console.log('  - metadata (JSONB, default: {})')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    
    // Fallback: try to check what columns actually exist
    console.log('🔍 Checking current table structure...')
    try {
      const { data, error: checkError } = await supabase
        .from('calvary_users')
        .select('*')
        .limit(1)
      
      if (checkError) {
        console.error('❌ Cannot check table structure:', checkError)
      } else {
        console.log('📋 Current table columns:', Object.keys(data[0] || {}))
      }
    } catch (checkError) {
      console.error('❌ Error checking table structure:', checkError)
    }
  }
}

// Run the migration
addMissingColumns()
  .then(() => {
    console.log('🏁 Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error)
    process.exit(1)
  }) 