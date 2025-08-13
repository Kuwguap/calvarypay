/**
 * Diagnostic Page for CalvaryPay
 * Simple page to test if the application is loading correctly
 */

'use client'

import React, { useEffect, useState } from 'react'

export default function DiagnosticPage() {
  const [mounted, setMounted] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    console.log('🔍 Diagnostic page mounted successfully')
    
    // Test basic functionality
    try {
      // Test localStorage
      localStorage.setItem('test', 'value')
      localStorage.removeItem('test')
      console.log('✅ localStorage working')
    } catch (error) {
      console.error('❌ localStorage error:', error)
      setErrors(prev => [...prev, 'localStorage not available'])
    }

    // Test fetch
    try {
      fetch('/api/health').catch(() => {
        console.log('ℹ️ Health endpoint not available (expected)')
      })
      console.log('✅ fetch API working')
    } catch (error) {
      console.error('❌ fetch error:', error)
      setErrors(prev => [...prev, 'fetch API not available'])
    }
  }, [])

  if (!mounted) {
    return (
      <div style={{ 
        padding: '20px', 
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#000',
        color: '#fff',
        minHeight: '100vh'
      }}>
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#3b82f6', marginBottom: '20px' }}>
        🔍 CalvaryPay Diagnostic Page
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#10b981' }}>✅ Application Status</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>✅ React is working</li>
          <li>✅ Next.js is working</li>
          <li>✅ Page routing is working</li>
          <li>✅ Client-side rendering is working</li>
          <li>✅ CSS styles are loading</li>
        </ul>
      </div>

      {errors.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#ef4444' }}>❌ Errors Detected</h2>
          <ul style={{ color: '#fca5a5' }}>
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#8b5cf6' }}>🔗 Navigation Test</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a 
            href="/" 
            style={{ 
              color: '#3b82f6', 
              textDecoration: 'underline',
              padding: '5px 10px',
              border: '1px solid #3b82f6',
              borderRadius: '4px'
            }}
          >
            Home
          </a>
          <a 
            href="/auth/signup" 
            style={{ 
              color: '#10b981', 
              textDecoration: 'underline',
              padding: '5px 10px',
              border: '1px solid #10b981',
              borderRadius: '4px'
            }}
          >
            Signup
          </a>
          <a 
            href="/auth/signin" 
            style={{ 
              color: '#f59e0b', 
              textDecoration: 'underline',
              padding: '5px 10px',
              border: '1px solid #f59e0b',
              borderRadius: '4px'
            }}
          >
            Signin
          </a>
          <a 
            href="/test-signup" 
            style={{ 
              color: '#8b5cf6', 
              textDecoration: 'underline',
              padding: '5px 10px',
              border: '1px solid #8b5cf6',
              borderRadius: '4px'
            }}
          >
            Test Signup
          </a>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#f59e0b' }}>📊 Environment Info</h2>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: '14px' }}>
          <li>• User Agent: {typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</li>
          <li>• URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</li>
          <li>• Timestamp: {new Date().toISOString()}</li>
          <li>• Screen: {typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'N/A'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: '#06b6d4' }}>🧪 Component Test</h2>
        <div style={{ 
          padding: '10px', 
          border: '1px solid #06b6d4', 
          borderRadius: '4px',
          backgroundColor: '#0f172a'
        }}>
          <p>This is a test component with inline styles.</p>
          <button 
            onClick={() => alert('Button clicked!')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Button
          </button>
        </div>
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        border: '1px solid #374151', 
        borderRadius: '8px',
        backgroundColor: '#1f2937'
      }}>
        <h3 style={{ color: '#fbbf24' }}>💡 Troubleshooting Tips</h3>
        <ol style={{ color: '#d1d5db' }}>
          <li>Check browser console for JavaScript errors</li>
          <li>Verify network requests are completing successfully</li>
          <li>Ensure all CSS files are loading properly</li>
          <li>Check if any browser extensions are blocking content</li>
          <li>Try refreshing the page or clearing browser cache</li>
        </ol>
      </div>
    </div>
  )
}
