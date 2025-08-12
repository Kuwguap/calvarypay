# 🗄️ **EliteePay Database Setup Instructions**

## **Critical: Database Setup Required for Authentication**

The EliteePay authentication system requires a properly configured Supabase database. Follow these steps to set up the database and resolve timeout issues.

---

## **📋 Step 1: Access Supabase SQL Editor**

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to your project**: https://supabase.com/dashboard/project/diuaiagnlxsdqiaydghs
3. **Open SQL Editor**: Click on "SQL Editor" in the left sidebar
4. **Create New Query**: Click "New Query"

---

## **🔧 Step 2: Execute Database Schema**

Copy and paste the following SQL into the Supabase SQL Editor and execute it:

```sql
-- EliteePay Database Schema
-- Execute this in your Supabase SQL Editor

-- Create users table
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

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage all users
CREATE POLICY IF NOT EXISTS "Service role can manage all users" 
ON users FOR ALL 
USING (auth.role() = 'service_role');

-- Create policy for authenticated users to read their own data
CREATE POLICY IF NOT EXISTS "Users can view their own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Insert test users with hashed passwords
-- Password for admin@eliteepay.com: Admin123!
-- Password for test@eliteepay.com: Test123!
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'admin@eliteepay.com',
  '$2a$12$QYyJgDVX5eHZ3BBgGaMGPeQCM8jKjjnGFtPBvg7LwpIuS61ZP/jUu',
  'System',
  'Administrator',
  'admin',
  true,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  'test@eliteepay.com',
  '$2a$12$Wa.qrvBKCy1D1aJEbcRPF.aVVXylUmDWgb0A6R83.KrCGcqquUv9y',
  'Test',
  'User',
  'customer',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;
```

---

## **✅ Step 3: Verify Database Setup**

After executing the SQL, verify the setup:

1. **Check Tables**: In the Supabase dashboard, go to "Table Editor"
2. **Verify Users Table**: You should see a "users" table with 2 test users
3. **Test Query**: Run this query to verify data:
   ```sql
   SELECT id, email, first_name, last_name, role FROM users;
   ```

---

## **🔐 Step 4: Test Authentication**

Once the database is set up, test the authentication:

### **Test Credentials:**
- **Admin User**: 
  - Email: `admin@eliteepay.com`
  - Password: `Admin123!`
- **Test User**: 
  - Email: `test@eliteepay.com`
  - Password: `Test123!`

### **Testing Steps:**
1. **Open Frontend**: http://localhost:3005/auth/signin
2. **Enter Test Credentials**: Use `test@eliteepay.com` / `Test123!`
3. **Submit Form**: The authentication should now work without timeout errors
4. **Verify Success**: You should be redirected to the dashboard

---

## **🚀 Current System Status**

### **✅ Services Running:**
- **API Gateway**: Port 3000 (Enhanced with 60s timeout)
- **User Service**: Port 3001 (Connected to real Supabase)
- **Payment Service**: Port 3002
- **Audit Service**: Port 3003
- **Pricing Service**: Port 3004
- **Frontend**: Port 3005 (Updated timeout configuration)

### **✅ Configuration Updated:**
- **Supabase Credentials**: Real credentials configured
- **Timeout Settings**: Increased to 60 seconds
- **CORS Headers**: Properly configured
- **Error Handling**: Enhanced throughout the system

---

## **🔍 Troubleshooting**

### **If Authentication Still Times Out:**

1. **Check Database Connection**:
   ```bash
   cd services/user-service
   node scripts/test-connection.js
   ```

2. **Verify Service Logs**:
   - Check User Service logs for database connection errors
   - Check API Gateway logs for proxy errors

3. **Test Direct Service**:
   ```bash
   curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@eliteepay.com","password":"Test123!"}'
   ```

### **Common Issues:**

- **"Table does not exist"**: Execute the database schema above
- **"Invalid credentials"**: Verify the test user was created correctly
- **"Connection timeout"**: Check Supabase project status and credentials

---

## **📞 Support**

If you continue to experience issues:

1. **Check Supabase Status**: https://status.supabase.com/
2. **Verify Project Settings**: Ensure the Supabase project is active
3. **Review Logs**: Check all service logs for specific error messages
4. **Test Individual Components**: Test each service independently

---

## **🎯 Expected Result**

After completing these steps:
- ✅ Database tables created and populated
- ✅ Authentication working without timeouts
- ✅ Users can log in with test credentials
- ✅ Complete frontend-to-database authentication flow functional

The EliteePay application will be fully operational with production-ready authentication!
