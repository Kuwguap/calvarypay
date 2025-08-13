# 🚀 CalvaryPay Quick Setup Guide

## 📋 Prerequisites Complete ✅

- ✅ **Supabase Project**: `ounhhutmnyedcntvzpni.supabase.co`
- ✅ **Environment Variables**: Updated with new credentials
- ✅ **Code Integration**: Real Supabase database configured
- ✅ **Dependencies**: bcryptjs installed for password hashing

## 🎯 One-Step Database Setup

### **Step 1: Open Supabase Dashboard**
1. Go to: **https://supabase.com/dashboard**
2. Select project: **`ounhhutmnyedcntvzpni`**
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### **Step 2: Run the Setup Script**
1. Open the file: **`SUPABASE_SQL_SETUP.sql`**
2. **Copy the ENTIRE contents** (all 150+ lines)
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** button

### **Step 3: Verify Success**
You should see messages like:
```
✅ CalvaryPay database setup completed successfully!
📊 Sample users created:
   - admin@calvarypay.com (password: admin123)
   - customer@calvarypay.com (password: password123)
   - employee@calvarypay.com (password: password123)
   - merchant@calvarypay.com (password: password123)
🚀 CalvaryPay is ready to use!
```

## 🧪 Test the Setup

### **Option 1: Test Registration**
1. Go to: **http://localhost:3007/auth/signup**
2. Fill out the form with any details
3. Submit - should work without errors!

### **Option 2: Test Login with Sample Users**
1. Go to: **http://localhost:3007/auth/signin**
2. Try any of these accounts:
   - **Admin**: `admin@calvarypay.com` / `admin123`
   - **Customer**: `customer@calvarypay.com` / `password123`
   - **Employee**: `employee@calvarypay.com` / `password123`
   - **Merchant**: `merchant@calvarypay.com` / `password123`

## 🎉 What the Setup Creates

### **Database Table: `calvary_users`**
```sql
- id (UUID, Primary Key)
- email (Unique, Required)
- phone (Optional)
- password_hash (bcrypt hashed)
- first_name, last_name
- role (customer/employee/merchant/admin)
- is_active, email_verified, phone_verified
- created_at, updated_at (auto-managed)
```

### **Security Features**
- ✅ **Row Level Security** enabled
- ✅ **Public access policy** for auth operations
- ✅ **Proper permissions** for anon/authenticated users
- ✅ **Role validation** constraints
- ✅ **Database indexes** for performance

### **Sample Data**
- ✅ **4 test users** (one for each role)
- ✅ **Secure password hashing** (bcrypt)
- ✅ **Ready-to-use accounts** for testing

## 🔧 Troubleshooting

### **If SQL Script Fails:**
1. **Check project selection**: Make sure you're in `ounhhutmnyedcntvzpni`
2. **Copy entire script**: Don't miss any lines
3. **Run as single query**: Paste all at once, don't run line by line

### **If Registration Still Fails:**
1. **Restart dev server**: `Ctrl+C` then `npm run dev`
2. **Check browser console**: Look for any JavaScript errors
3. **Verify table exists**: In Supabase, go to "Table Editor" and look for `calvary_users`

### **If Login Fails:**
1. **Try sample accounts first**: Use the pre-created test users
2. **Check password**: Make sure you're using the correct passwords
3. **Verify user exists**: Check the `calvary_users` table in Supabase

## 📊 Current Configuration

```bash
🔗 Supabase URL: https://ounhhutmnyedcntvzpni.supabase.co
🔑 Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...SIRTIzc
🛡️ Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...yWOng
🗄️ Table: calvary_users
🔒 Security: bcrypt + RLS enabled
```

## ✅ Success Indicators

After setup, you should be able to:
- ✅ **Register new users** through the signup form
- ✅ **Login with registered credentials**
- ✅ **Access role-based dashboards**
- ✅ **See users in Supabase table editor**
- ✅ **Password verification working** (bcrypt)

**Total setup time: ~2 minutes** ⏱️

Once the SQL script runs successfully, CalvaryPay will be fully operational with real Supabase database persistence! 🎉
