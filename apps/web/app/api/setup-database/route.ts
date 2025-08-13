/**
 * Database Setup API Route for CalvaryPay
 * Creates the required database schema in Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up CalvaryPay database schema...')
    
    // Create service client with admin privileges
    const supabase = createServiceClient()
    
    // Create calvary_users table (separate from Supabase auth.users)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS calvary_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) NOT NULL DEFAULT 'customer',
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          phone_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    })
    
    if (createError) {
      console.error('Error creating table:', createError)
      // Try alternative approach - direct table creation
      const { error: directError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (directError && directError.code === 'PGRST204') {
        // Table doesn't exist, let's create it using a different approach
        console.log('Table does not exist, attempting to create...')
        
        // Try to create the table directly using insert/select approach
        console.log('Attempting to create calvary_users table...')

        // Test if calvary_users table exists by trying to select from it
        const { data: testData, error: testError } = await supabase
          .from('calvary_users')
          .select('count')
          .limit(1)

        if (testError && testError.code === 'PGRST204') {
          return NextResponse.json({
            message: 'CalvaryPay users table does not exist',
            error: 'Please create the calvary_users table manually in Supabase',
            setupInstructions: [
              '1. Go to your Supabase dashboard',
              '2. Navigate to SQL Editor',
              '3. Run this SQL:',
              'CREATE TABLE calvary_users (',
              '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),',
              '  email VARCHAR(255) UNIQUE NOT NULL,',
              '  phone VARCHAR(20),',
              '  password_hash VARCHAR(255) NOT NULL,',
              '  first_name VARCHAR(100),',
              '  last_name VARCHAR(100),',
              '  role VARCHAR(50) NOT NULL DEFAULT \'customer\',',
              '  is_active BOOLEAN DEFAULT true,',
              '  email_verified BOOLEAN DEFAULT false,',
              '  phone_verified BOOLEAN DEFAULT false,',
              '  created_at TIMESTAMPTZ DEFAULT NOW(),',
              '  updated_at TIMESTAMPTZ DEFAULT NOW()',
              ');',
              '4. Add RLS policy: CREATE POLICY "Allow public access" ON calvary_users FOR ALL USING (true);',
              '5. Grant permissions: GRANT ALL ON calvary_users TO anon, authenticated;'
            ]
          }, { status: 400 })
        }
      }
    }
    
    // Add constraints and indexes
    const constraintsSQL = `
      -- Add check constraint for valid roles
      ALTER TABLE calvary_users
      ADD CONSTRAINT IF NOT EXISTS calvary_users_role_check
      CHECK (role IN ('customer', 'employee', 'merchant', 'admin'));

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_calvary_users_role ON calvary_users(role);
      CREATE INDEX IF NOT EXISTS idx_calvary_users_email ON calvary_users(email);
    `
    
    const { error: constraintsError } = await supabase.rpc('exec_sql', { 
      sql: constraintsSQL 
    })
    
    if (constraintsError) {
      console.log('Note: Could not add constraints via RPC, but table should exist')
    }
    
    // Test the table by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from('calvary_users')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('Table test failed:', testError)
      return NextResponse.json({
        message: 'Database setup incomplete',
        error: testError.message,
        setupInstructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to SQL Editor', 
          '3. Run the setup-database.sql script provided',
          '4. This will create the users table with all required columns'
        ]
      }, { status: 400 })
    }
    
    console.log('✅ Database schema setup completed successfully')
    
    return NextResponse.json({
      message: 'Database schema setup completed successfully',
      tableExists: true,
      ready: true
    })
    
  } catch (error) {
    console.error('❌ Database setup error:', error)
    
    return NextResponse.json({
      message: 'Database setup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      setupInstructions: [
        '1. Go to your Supabase dashboard',
        '2. Navigate to SQL Editor',
        '3. Run the setup-database.sql script',
        '4. This will create the users table with all required columns'
      ]
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Setup Endpoint',
    instructions: 'Send a POST request to set up the database schema',
    sqlScript: 'Use the setup-database.sql file provided'
  })
}
