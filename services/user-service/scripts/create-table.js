#!/usr/bin/env node

/**
 * Create users table directly in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUsersTable() {
  console.log('🚀 Creating users table in Supabase...');
  
  try {
    // First, let's try to create the table using a simple approach
    console.log('📋 Creating users table...');
    
    // Create the table using the REST API
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'customer',
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          phone_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Service role can manage all users" 
        ON users FOR ALL 
        USING (auth.role() = 'service_role');
      `
    });
    
    if (createError) {
      console.log('⚠️  Could not create table via RPC:', createError.message);
      console.log('📋 Please create the table manually using the SQL editor');
      return false;
    }
    
    console.log('✅ Users table created successfully');
    
    // Now insert test users
    await insertTestUsers();
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to create users table:', error.message);
    return false;
  }
}

async function insertTestUsers() {
  console.log('👥 Inserting test users...');
  
  try {
    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
    const testPasswordHash = await bcrypt.hash('Test123!', 12);
    
    const testUsers = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@eliteepay.com',
        password_hash: adminPasswordHash,
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true,
        email_verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'test@eliteepay.com',
        password_hash: testPasswordHash,
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        is_active: true,
        email_verified: true
      }
    ];
    
    for (const user of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (existingUser) {
          console.log(`✅ User ${user.email} already exists`);
          continue;
        }
        
        // Insert user
        const { error } = await supabase
          .from('users')
          .insert(user);
        
        if (error) {
          console.error(`❌ Failed to create user ${user.email}:`, error.message);
        } else {
          console.log(`✅ Created user: ${user.email}`);
        }
        
      } catch (error) {
        console.error(`❌ Error creating user ${user.email}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to insert test users:', error.message);
  }
}

async function testTableExists() {
  console.log('🔍 Testing if users table exists...');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Users table does not exist:', error.message);
      return false;
    } else {
      console.log('✅ Users table exists and is accessible');
      return true;
    }
  } catch (error) {
    console.log('❌ Error testing table:', error.message);
    return false;
  }
}

// Run the script
async function main() {
  console.log('🔍 Checking if users table exists...');
  
  const tableExists = await testTableExists();
  
  if (!tableExists) {
    console.log('📋 Users table does not exist. Creating it...');
    const created = await createUsersTable();
    
    if (!created) {
      console.log('\n📋 Manual Setup Required:');
      console.log('Please execute the SQL from DATABASE_SETUP_INSTRUCTIONS.md in your Supabase SQL editor:');
      console.log('🔗 https://supabase.com/dashboard/project/diuaiagnlxsdqiaydghs/sql');
      process.exit(1);
    }
  } else {
    console.log('✅ Users table already exists');
    await insertTestUsers();
  }
  
  console.log('🎉 Database setup completed!');
}

main().catch(console.error);
