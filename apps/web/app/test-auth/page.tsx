"use client"

import { useState } from "react"
import { authService } from "@/lib/services/auth.service"

export default function TestAuthPage() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "test@eliteepay.com",
    password: "Test123!"
  })

  const testLogin = async () => {
    setLoading(true)
    setResult("")
    
    try {
      console.log("🧪 Testing login...")
      
      const response = await authService.login({
        email: "test@eliteepay.com",
        password: "Test123!"
      })
      
      console.log("✅ Test login successful:", response)
      setResult(`SUCCESS: ${JSON.stringify(response, null, 2)}`)
      
    } catch (error: any) {
      console.error("❌ Test login failed:", error)
      setResult(`ERROR: ${error.message || error.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  const testApiDirect = async () => {
    setLoading(true)
    setResult("")

    try {
      console.log("🧪 Testing direct API call...")

      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@eliteepay.com",
          password: "Test123!"
        })
      })

      const data = await response.json()
      console.log("✅ Direct API test successful:", data)
      setResult(`DIRECT API SUCCESS: ${JSON.stringify(data, null, 2)}`)

    } catch (error: any) {
      console.error("❌ Direct API test failed:", error)
      setResult(`DIRECT API ERROR: ${error.message || error.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("📝 Form submitted!")

    setLoading(true)
    setResult("")

    try {
      console.log("🧪 Testing form submission with auth service...")

      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      })

      console.log("✅ Form test successful:", response)
      setResult(`FORM SUCCESS: ${JSON.stringify(response, null, 2)}`)

    } catch (error: any) {
      console.error("❌ Form test failed:", error)
      setResult(`FORM ERROR: ${error.message || error.toString()}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={() => {
              console.log("🧪 Basic JS test clicked!");
              alert("JavaScript is working!");
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-4"
          >
            Test JavaScript
          </button>

          <button
            onClick={testLogin}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Test Auth Service Login"}
          </button>

          <button
            onClick={testApiDirect}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-4"
          >
            {loading ? "Testing..." : "Test Direct API Call"}
          </button>
        </div>

        <div className="bg-white p-6 rounded border mb-8">
          <h2 className="text-xl font-semibold mb-4">Form Test</h2>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password:</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? "Testing..." : "Test Form Submit"}
            </button>
          </form>
        </div>
        
        {result && (
          <div className="bg-white p-4 rounded border">
            <h2 className="text-xl font-semibold mb-4">Result:</h2>
            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded overflow-auto">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
