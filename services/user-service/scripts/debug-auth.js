#!/usr/bin/env node

/**
 * Debug Authentication Issues
 * This script will test every step of the authentication process
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 COMPREHENSIVE AUTHENTICATION DEBUG');
console.log('=====================================');

async function debugAuthentication() {
  console.log('\n1. 🔧 ENVIRONMENT CHECK');
  console.log('URL:', supabaseUrl ? '✅ SET' : '❌ MISSING');
  console.log('Service Key:', supabaseServiceKey ? '✅ SET' : '❌ MISSING');
  console.log('Anon Key:', supabaseAnonKey ? '✅ SET' : '❌ MISSING');

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.log('❌ Missing environment variables');
    return;
  }

  // Create clients
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  console.log('\n2. 🗄️ DATABASE CONNECTION TEST');
  try {
    const { data: connectionTest, error: connectionError } = await serviceClient
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message);
      
      if (connectionError.message.includes('Could not find the table')) {
        console.log('\n🚨 CRITICAL ISSUE: Users table does not exist!');
        console.log('📋 You need to create the users table in Supabase');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/diuaiagnlxsdqiaydghs/sql');
        console.log('📄 Execute the SQL from DATABASE_SETUP_INSTRUCTIONS.md');
        return;
      }
    } else {
      console.log('✅ Database connection successful');
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return;
  }

  console.log('\n3. 📊 TABLE STRUCTURE CHECK');
  try {
    const { data: tableInfo, error: tableError } = await serviceClient
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table query failed:', tableError.message);
      return;
    } else {
      console.log('✅ Users table exists and is queryable');
      console.log('📊 Sample structure:', tableInfo.length > 0 ? Object.keys(tableInfo[0]) : 'No data');
    }
  } catch (error) {
    console.log('❌ Table structure error:', error.message);
  }

  console.log('\n4. 👥 USER DATA CHECK');
  try {
    const { data: users, error: usersError } = await serviceClient
      .from('users')
      .select('id, email, first_name, last_name, is_active, email_verified')
      .limit(10);
    
    if (usersError) {
      console.log('❌ User query failed:', usersError.message);
    } else {
      console.log('✅ User query successful');
      console.log('👥 Total users found:', users.length);
      
      if (users.length === 0) {
        console.log('⚠️  No users in database - need to insert test users');
      } else {
        console.log('📋 Users in database:');
        users.forEach(user => {
          console.log(`  - ${user.email} (${user.first_name} ${user.last_name}) - Active: ${user.is_active}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ User data error:', error.message);
  }

  console.log('\n5. 🔍 SPECIFIC USER TEST');
  const testEmail = 'test@eliteepay.com';
  try {
    const { data: testUser, error: testUserError } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    if (testUserError) {
      if (testUserError.code === 'PGRST116') {
        console.log(`❌ Test user ${testEmail} not found in database`);
        console.log('📋 Need to insert test user with correct password hash');
      } else {
        console.log('❌ Test user query failed:', testUserError.message);
      }
    } else {
      console.log(`✅ Test user ${testEmail} found`);
      console.log('📊 User details:');
      console.log(`  - ID: ${testUser.id}`);
      console.log(`  - Email: ${testUser.email}`);
      console.log(`  - Name: ${testUser.first_name} ${testUser.last_name}`);
      console.log(`  - Active: ${testUser.is_active}`);
      console.log(`  - Email Verified: ${testUser.email_verified}`);
      console.log(`  - Password Hash: ${testUser.password_hash ? 'Present' : 'Missing'}`);
      
      // Test password verification
      if (testUser.password_hash) {
        console.log('\n6. 🔐 PASSWORD VERIFICATION TEST');
        const testPassword = 'Test123!';
        try {
          const isValid = await bcrypt.compare(testPassword, testUser.password_hash);
          console.log(`🔑 Password "${testPassword}" is ${isValid ? '✅ VALID' : '❌ INVALID'}`);
          
          if (!isValid) {
            console.log('🚨 PASSWORD MISMATCH - This is likely the issue!');
            console.log('💡 The stored password hash does not match the test password');
            console.log('🔧 Need to update the password hash in the database');
          }
        } catch (error) {
          console.log('❌ Password verification error:', error.message);
        }
      }
    }
  } catch (error) {
    console.log('❌ Specific user test error:', error.message);
  }

  console.log('\n7. 🔨 CLIENT TYPE TEST');
  try {
    // Test with service client (should work)
    const { data: serviceTest, error: serviceError } = await serviceClient
      .from('users')
      .select('email')
      .eq('email', testEmail)
      .single();
    
    console.log('🔧 Service client test:', serviceError ? `❌ ${serviceError.message}` : '✅ Working');
    
    // Test with anon client (might fail due to RLS)
    const { data: anonTest, error: anonError } = await anonClient
      .from('users')
      .select('email')
      .eq('email', testEmail)
      .single();
    
    console.log('👤 Anon client test:', anonError ? `❌ ${anonError.message}` : '✅ Working');
    
    if (anonError && anonError.message.includes('permission denied')) {
      console.log('⚠️  RLS (Row Level Security) is blocking anon client access');
      console.log('💡 This might be the issue - auth service might be using wrong client');
    }
  } catch (error) {
    console.log('❌ Client test error:', error.message);
  }

  console.log('\n8. 🔧 GENERATE CORRECT PASSWORD HASH');
  try {
    const correctHash = await bcrypt.hash('Test123!', 12);
    console.log('🔑 Correct password hash for "Test123!":');
    console.log(correctHash);
    console.log('\n📋 SQL to update password:');
    console.log(`UPDATE users SET password_hash = '${correctHash}' WHERE email = '${testEmail}';`);
  } catch (error) {
    console.log('❌ Hash generation error:', error.message);
  }

  console.log('\n=====================================');
  console.log('🎯 AUTHENTICATION DEBUG COMPLETE');
}

debugAuthentication().catch(console.error);
