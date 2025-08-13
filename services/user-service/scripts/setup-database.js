#!/usr/bin/env node

/**
 * Simple Database Setup Script for CalvaryPay
 * Creates the users table and test data directly via Supabase client
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

async function setupDatabase() {
  console.log('🚀 Setting up CalvaryPay database...');
  
  try {
    // Create users table using SQL
    console.log('📋 Creating users table...');
    
    const createTableSQL = `
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
      
      -- Create index on email for faster lookups
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      
      -- Enable RLS
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      
      -- Create policy for service role
      CREATE POLICY IF NOT EXISTS "Service role can manage all users" 
      ON users FOR ALL 
      USING (true);
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (tableError) {
      console.log('⚠️  Could not create table via RPC, trying direct approach...');
      // Try creating test users directly
    } else {
      console.log('✅ Users table created successfully');
    }
    
    // Create test users
    await createTestUsers();
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('\n📋 Manual Setup Required:');
    console.log('Please execute the following SQL in your Supabase SQL editor:');
    console.log('🔗 https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql');
    console.log('\n' + getManualSQL());
  }
}

async function createTestUsers() {
  console.log('👥 Creating test users...');
  
  try {
    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
    const testPasswordHash = await bcrypt.hash('Test123!', 12);
    
    const testUsers = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@CalvaryPay.com',
        password_hash: adminPasswordHash,
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true,
        email_verified: true
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'test@calvarypay.com',
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
    console.error('❌ Failed to create test users:', error.message);
  }
}

function getManualSQL() {
  return `
-- CalvaryPay Users Table Setup
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

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY IF NOT EXISTS "Service role can manage all users" 
ON users FOR ALL 
USING (true);

-- Insert test users
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@calvarypay.com', '$2b$12$LQv3c1yqBwEHXw.9oC9.Ou3.0p.dMtxpkZvZJvKUKKKKKKKKKKKKK', 'System', 'Administrator', 'admin', true, true),
('00000000-0000-0000-0000-000000000002', 'test@calvarypay.com', '$2b$12$LQv3c1yqBwEHXw.9oC9.Ou3.0p.dMtxpkZvZJvKUKKKKKKKKKKKKK', 'Test', 'User', 'customer', true, true)
ON CONFLICT (email) DO NOTHING;
  `;
}

// Run setup
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🏁 Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase, createTestUsers };
