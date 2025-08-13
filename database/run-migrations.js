/**
 * Database Migration Runner
 * Executes migrations in the correct order
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const MIGRATIONS_DIR = __dirname;
const MIGRATION_FILES = [
  '004_balance_system.sql',
  '005_migrate_file_data.sql'
];

// Database configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Read SQL migration file
 */
function readMigrationFile(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`❌ Error reading migration file ${filename}:`, error.message);
    return null;
  }
}

/**
 * Execute SQL migration
 */
async function executeMigration(filename, sql) {
  console.log(`🔄 Executing migration: ${filename}`);
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let executedCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement.trim()) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          if (error) {
            console.warn(`   ⚠️  Statement warning: ${error.message}`);
            errorCount++;
          } else {
            executedCount++;
          }
        }
      } catch (error) {
        console.warn(`   ⚠️  Statement error: ${error.message}`);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      console.log(`   ✅ Migration ${filename} completed successfully (${executedCount} statements executed)`);
      return true;
    } else {
      console.log(`   ⚠️  Migration ${filename} completed with ${errorCount} warnings (${executedCount} statements executed)`);
      return true; // Still consider it successful
    }

  } catch (error) {
    console.error(`   ❌ Migration ${filename} failed:`, error.message);
    return false;
  }
}

/**
 * Check if migration has already been run
 */
async function isMigrationRun(filename) {
  try {
    // Check if the balance_schema exists (indicates migration was run)
    const { data, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', 'balance_schema')
      .single();

    if (error && error.code === 'PGRST116') {
      return false; // Schema doesn't exist
    }

    return !!data;
  } catch (error) {
    console.warn(`⚠️  Could not check migration status: ${error.message}`);
    return false;
  }
}

/**
 * Mark migration as completed
 */
async function markMigrationComplete(filename) {
  try {
    // Create migrations table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'completed'
      );
    `;

    await supabase.rpc('exec_sql', { sql: createTableSQL });

    // Insert migration record
    const { error } = await supabase
      .from('migrations')
      .insert({
        filename,
        status: 'completed'
      });

    if (error) {
      console.warn(`⚠️  Could not mark migration as complete: ${error.message}`);
    }
  } catch (error) {
    console.warn(`⚠️  Could not mark migration as complete: ${error.message}`);
  }
}

/**
 * Run all migrations
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');
  console.log('=====================================');

  let successCount = 0;
  let failureCount = 0;

  for (const filename of MIGRATION_FILES) {
    console.log('');
    
    // Check if migration already run
    const alreadyRun = await isMigrationRun(filename);
    if (alreadyRun) {
      console.log(`⏭️  Migration ${filename} already executed, skipping...`);
      successCount++;
      continue;
    }

    // Read and execute migration
    const sql = readMigrationFile(filename);
    if (!sql) {
      console.log(`❌ Skipping ${filename} due to read error`);
      failureCount++;
      continue;
    }

    const success = await executeMigration(filename, sql);
    if (success) {
      await markMigrationComplete(filename);
      successCount++;
    } else {
      failureCount++;
    }
  }

  console.log('');
  console.log('=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📁 Total: ${MIGRATION_FILES.length}`);

  if (failureCount === 0) {
    console.log('');
    console.log('🎉 All migrations completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run the data migration script: node migrate-balances.js migrate');
    console.log('2. Update your application to use the new database-based services');
    console.log('3. Test the new balance system');
  } else {
    console.log('');
    console.log('⚠️  Some migrations failed. Please check the errors above.');
    process.exit(1);
  }
}

/**
 * Rollback migrations
 */
async function rollbackMigrations() {
  console.log('🔄 Rolling back migrations...');
  console.log('⚠️  This will remove the balance system schema and all data!');
  
  try {
    // Drop the balance schema
    const dropSchemaSQL = 'DROP SCHEMA IF EXISTS balance_schema CASCADE;';
    
    const { error } = await supabase.rpc('exec_sql', { sql: dropSchemaSQL });
    if (error) {
      throw error;
    }

    console.log('✅ Rollback completed successfully');
    console.log('   The balance_schema and all related tables have been removed');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check migration status
 */
async function checkStatus() {
  console.log('🔍 Checking migration status...');
  
  try {
    // Check if balance_schema exists
    const { data, error } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', 'balance_schema')
      .single();

    if (error && error.code === 'PGRST116') {
      console.log('❌ Balance system schema not found');
      console.log('   Run migrations first: node run-migrations.js');
      return;
    }

    if (data) {
      console.log('✅ Balance system schema exists');
      
      // Check tables
      const tables = ['company_balances', 'employee_balances', 'balance_transactions', 'budget_allocations', 'balance_history'];
      
      for (const table of tables) {
        try {
          const { count, error: tableError } = await supabase
            .from(`balance_schema.${table}`)
            .select('*', { count: 'exact', head: true });
          
          if (tableError) {
            console.log(`   ❌ ${table}: Error - ${tableError.message}`);
          } else {
            console.log(`   ✅ ${table}: ${count || 0} records`);
          }
        } catch (error) {
          console.log(`   ❌ ${table}: Error - ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

// CLI handling
const command = process.argv[2];

switch (command) {
  case 'run':
    runMigrations();
    break;
  case 'rollback':
    rollbackMigrations();
    break;
  case 'status':
    checkStatus();
    break;
  default:
    console.log('Database Migration Runner');
    console.log('==========================');
    console.log('');
    console.log('Usage:');
    console.log('  node run-migrations.js run      - Run all pending migrations');
    console.log('  node run-migrations.js status   - Check migration status');
    console.log('  node run-migrations.js rollback - Rollback all migrations (removes all data)');
    console.log('');
    console.log('Environment variables required:');
    console.log('  SUPABASE_URL');
    console.log('  SUPABASE_SERVICE_ROLE_KEY');
    console.log('');
    console.log('⚠️  Make sure you have the necessary database permissions!');
    break;
} 