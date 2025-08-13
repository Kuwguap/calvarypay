/**
 * Debug sign-in issues
 */

const testSigninDebug = async () => {
  console.log('🔍 Debugging CalvaryPay sign-in issues...')
  console.log('')
  
  // Test 1: Check if database table exists
  console.log('='.repeat(50))
  console.log('Test 1: Database Connection & Table Check')
  console.log('='.repeat(50))
  
  try {
    const response = await fetch('http://localhost:3005/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Debug',
        lastName: 'Test',
        email: 'debug.test@example.com',
        phone: '+233545482999',
        password: 'DebugTest123!',
        confirmPassword: 'DebugTest123!',
        role: 'customer',
        acceptTerms: true
      })
    })
    
    const result = await response.json()
    console.log('Registration Status:', response.status)
    
    if (response.status === 200) {
      console.log('✅ Database table exists and working!')
      console.log('✅ Registration successful')
    } else if (response.status === 500) {
      console.log('❌ Database table issue detected')
      console.log('Error:', result.error || 'Unknown error')
      
      if (result.error?.includes('calvary_users')) {
        console.log('')
        console.log('🚨 SOLUTION NEEDED:')
        console.log('1. Go to https://supabase.com/dashboard')
        console.log('2. Select project: ounhhutmnyedcntvzpni')
        console.log('3. Open SQL Editor')
        console.log('4. Run the SUPABASE_SQL_SETUP.sql script')
        return
      }
    }
  } catch (error) {
    console.log('❌ Network error:', error.message)
    return
  }
  
  console.log('')
  
  // Test 2: Try signing in with sample user
  console.log('='.repeat(50))
  console.log('Test 2: Sign-in with Sample User')
  console.log('='.repeat(50))
  
  try {
    const loginResponse = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@calvarypay.com',
        password: 'admin123'
      })
    })
    
    const loginResult = await loginResponse.json()
    console.log('Login Status:', loginResponse.status)
    
    if (loginResponse.status === 200) {
      console.log('✅ Sign-in successful!')
      console.log('User:', loginResult.user.email)
      console.log('Role:', loginResult.user.role)
      console.log('Tokens:', !!loginResult.tokens)
    } else {
      console.log('❌ Sign-in failed')
      console.log('Error:', loginResult.error?.message || 'Unknown error')
      
      if (loginResult.error?.message === 'Invalid email or password') {
        console.log('')
        console.log('🔍 POSSIBLE CAUSES:')
        console.log('1. Sample users not created (SQL script not run)')
        console.log('2. Wrong password (should be: admin123)')
        console.log('3. Database table empty')
      }
    }
  } catch (error) {
    console.log('❌ Login network error:', error.message)
  }
  
  console.log('')
  
  // Test 3: Try other sample users
  console.log('='.repeat(50))
  console.log('Test 3: Try Other Sample Users')
  console.log('='.repeat(50))
  
  const testUsers = [
    { email: 'customer@calvarypay.com', password: 'password123', role: 'customer' },
    { email: 'employee@calvarypay.com', password: 'password123', role: 'employee' },
    { email: 'merchant@calvarypay.com', password: 'password123', role: 'merchant' }
  ]
  
  for (const user of testUsers) {
    try {
      const response = await fetch('http://localhost:3005/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      })
      
      const result = await response.json()
      
      if (response.status === 200) {
        console.log(`✅ ${user.role.toUpperCase()}: Login successful`)
      } else {
        console.log(`❌ ${user.role.toUpperCase()}: Login failed - ${result.error?.message}`)
      }
    } catch (error) {
      console.log(`❌ ${user.role.toUpperCase()}: Network error`)
    }
  }
  
  console.log('')
  console.log('🎯 SUMMARY:')
  console.log('If all tests fail, run the SQL setup script in Supabase dashboard')
  console.log('If registration works but login fails, check sample user passwords')
}

testSigninDebug()
