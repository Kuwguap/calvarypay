#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * Tests the connection to Supabase with the current environment variables
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set');
console.log('🔐 Service Key:', supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'Not set');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

async function testConnection() {
  try {
    // Test with anon key
    console.log('\n📡 Testing connection with anon key...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: anonData, error: anonError } = await anonClient
      .from('users')
      .select('count')
      .limit(1);
    
    if (anonError) {
      console.log('⚠️  Anon key connection:', anonError.message);
    } else {
      console.log('✅ Anon key connection successful');
    }
    
    // Test with service role key
    console.log('\n🔐 Testing connection with service role key...');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('users')
      .select('count')
      .limit(1);
    
    if (serviceError) {
      if (serviceError.code === '42P01') {
        console.log('⚠️  Users table does not exist yet. This is expected for a new project.');
        console.log('📋 Please run the database schema first.');
      } else {
        console.log('❌ Service key connection error:', serviceError.message);
      }
    } else {
      console.log('✅ Service key connection successful');
      console.log('📊 Users table exists and is accessible');
    }
    
    // Test basic query
    console.log('\n🔍 Testing basic query...');
    const { data: tables, error: tablesError } = await serviceClient
      .rpc('get_schema_tables');
    
    if (tablesError) {
      console.log('⚠️  Could not fetch schema info:', tablesError.message);
    } else {
      console.log('✅ Schema query successful');
    }
    
  } catch (error) {
    console.error('💥 Connection test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testConnection()
  .then(() => {
    console.log('\n🎉 Connection test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
