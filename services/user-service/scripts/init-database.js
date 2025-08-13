#!/usr/bin/env node

/**
 * Database Initialization Script for CalvaryPay User Service
 * This script initializes the Supabase database with the required schema and test data
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

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

async function initializeDatabase() {
  console.log('🚀 Initializing CalvaryPay database...');
  
  try {
    // Test connection
    console.log('📡 Testing database connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📋 Users table does not exist. Creating schema...');
      await createSchema();
    } else if (error) {
      console.error('❌ Database connection failed:', error.message);
      return;
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Create test users
    await createTestUsers();
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

async function createSchema() {
  console.log('📋 Creating database schema...');
  
  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    return;
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Note: Supabase doesn't support executing raw SQL via the client
  // The schema needs to be executed manually in the Supabase dashboard
  console.log('⚠️  Please execute the following schema in your Supabase SQL editor:');
  console.log('📁 File location:', schemaPath);
  console.log('🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql');
}

async function createTestUsers() {
  console.log('👥 Creating test users...');
  
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
      status: 'active',
      is_active: true,
      email_verified: true
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'test@CalvaryPay.com',
      password_hash: testPasswordHash,
      first_name: 'Test',
      last_name: 'User',
      role: 'customer',
      status: 'active',
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
}

async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  try {
    // Test login with test user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'test@CalvaryPay.com')
      .eq('is_active', true)
      .single();
    
    if (user) {
      const isPasswordValid = await bcrypt.compare('Test123!', user.password_hash);
      if (isPasswordValid) {
        console.log('✅ Test authentication successful');
      } else {
        console.log('❌ Test authentication failed - password mismatch');
      }
    } else {
      console.log('❌ Test user not found');
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => testAuthentication())
    .then(() => {
      console.log('🏁 Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase, createTestUsers, testAuthentication };
