#!/usr/bin/env node

/**
 * Generate hashed passwords for test users
 */

const bcrypt = require('bcryptjs');

async function generatePasswords() {
  console.log('🔐 Generating hashed passwords...');
  
  const passwords = [
    { user: 'admin@CalvaryPay.com', password: 'Admin123!' },
    { user: 'test@CalvaryPay.com', password: 'Test123!' }
  ];
  
  for (const { user, password } of passwords) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`\n👤 ${user}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🔒 Hash: ${hash}`);
  }
  
  console.log('\n📋 SQL Insert Statement:');
  
  const adminHash = await bcrypt.hash('Admin123!', 12);
  const testHash = await bcrypt.hash('Test123!', 12);
  
  console.log(`
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'admin@CalvaryPay.com',
  '${adminHash}',
  'System',
  'Administrator',
  'admin',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'test@CalvaryPay.com',
  '${testHash}',
  'Test',
  'User',
  'customer',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;
  `);
}

generatePasswords().catch(console.error);
