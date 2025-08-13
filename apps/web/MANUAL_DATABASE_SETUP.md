# Manual Database Setup for CalvaryPay

Since we cannot programmatically create tables in Supabase, please follow these steps to set up the database manually:

## Step 1: Go to Supabase Dashboard

1. Open your browser and go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `diuaiagnlxsdqiaydghs`

## Step 2: Open SQL Editor

1. In the left sidebar, click on "SQL Editor"
2. Click "New Query" to create a new SQL script

## Step 3: Run the Following SQL Script

Copy and paste this entire script into the SQL Editor and click "Run":

```sql
-- CalvaryPay Database Setup for Supabase
-- Create calvary_users table (separate from Supabase auth.users)

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

-- Add check constraint for valid roles
ALTER TABLE calvary_users 
ADD CONSTRAINT IF NOT EXISTS calvary_users_role_check 
CHECK (role IN ('customer', 'employee', 'merchant', 'admin'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calvary_users_role ON calvary_users(role);
CREATE INDEX IF NOT EXISTS idx_calvary_users_email ON calvary_users(email);

-- Enable Row Level Security
ALTER TABLE calvary_users ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for CalvaryPay (allows public access for registration/auth)
CREATE POLICY "Allow public access to calvary_users" ON calvary_users
    FOR ALL USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON calvary_users TO authenticated;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_calvary_users_updated_at ON calvary_users;
CREATE TRIGGER update_calvary_users_updated_at
    BEFORE UPDATE ON calvary_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Step 4: Verify Setup

After running the script, you should see a success message. The `calvary_users` table should now be created with all the required columns.

## Step 5: Test the Setup

Once the table is created, you can test the CalvaryPay registration by:

1. Going to: http://localhost:3007/auth/signup
2. Filling out the registration form
3. Submitting the form

The registration should now work without errors!

## Troubleshooting

If you encounter any issues:

1. **Permission Errors**: Make sure the GRANT statements ran successfully
2. **RLS Errors**: Ensure the policy was created correctly
3. **Column Errors**: Verify all columns were created by running: `SELECT * FROM calvary_users LIMIT 1;`

## What This Creates

The script creates:
- ✅ `calvary_users` table with all required columns
- ✅ Role validation constraint (customer, employee, merchant, admin)
- ✅ Database indexes for performance
- ✅ Row Level Security with permissive policy
- ✅ Proper permissions for anon and authenticated users
- ✅ Auto-updating `updated_at` timestamp

After completing these steps, CalvaryPay will use the real Supabase database instead of mock data!
