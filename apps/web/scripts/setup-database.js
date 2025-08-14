#!/usr/bin/env node

/**
 * Database Setup Script for CalvaryPay
 * Runs migrations to set up the database schema
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up CalvaryPay database...');

// Path to migrations
const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
const migrations = [
  '001_security_tables.sql',
  '002_enhanced_transactions.sql', 
  '003_employee_invitations.sql',
  '004_employee_transfers.sql'
];

console.log('📁 Migrations directory:', migrationsDir);
console.log('📋 Found migrations:', migrations);

// Check if migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  console.log('💡 Please ensure the migrations directory exists and contains the SQL files');
  process.exit(1);
}

// Display migration contents
migrations.forEach((migration, index) => {
  const migrationPath = path.join(migrationsDir, migration);
  console.log(`\n📄 Migration ${index + 1}: ${migration}`);
  
  if (fs.existsSync(migrationPath)) {
    const content = fs.readFileSync(migrationPath, 'utf8');
    console.log(`   Size: ${content.length} characters`);
    console.log(`   Tables: ${(content.match(/CREATE TABLE/g) || []).length} tables`);
    console.log(`   Indexes: ${(content.match(/CREATE INDEX/g) || []).length} indexes`);
  } else {
    console.log('   ❌ File not found');
  }
});

console.log('\n✅ Database setup script completed!');
console.log('💡 To apply these migrations, you need to:');
console.log('   1. Connect to your PostgreSQL database');
console.log('   2. Run each migration file in order');
console.log('   3. Or use a migration tool like Prisma, TypeORM, or manual SQL execution');
console.log('\n🔗 For Supabase, you can run these in the SQL editor');
console.log('🔗 For local development, use psql or your preferred database client'); 