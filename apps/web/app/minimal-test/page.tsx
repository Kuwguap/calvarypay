/**
 * Minimal Test Page
 * Basic HTML without any complex components
 */

export default function MinimalTestPage() {
  return (
    <html>
      <head>
        <title>Minimal Test</title>
        <style>{`
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #0f172a;
            color: white;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          .success {
            color: #10b981;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .link {
            color: #3b82f6;
            text-decoration: underline;
            margin-right: 20px;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <h1 className="success">✅ CalvaryPay Application is Working!</h1>
          
          <p>If you can see this page, the Next.js application is running correctly.</p>
          
          <h2>Navigation Links:</h2>
          <div>
            <a href="/" className="link">Home Page</a>
            <a href="/auth/signup" className="link">Signup</a>
            <a href="/auth/signin" className="link">Signin</a>
            <a href="/diagnostic" className="link">Diagnostic</a>
          </div>
          
          <h2>Possible Issues with Blank Screen:</h2>
          <ul>
            <li>JavaScript errors in browser console</li>
            <li>CSS not loading properly</li>
            <li>Component rendering errors</li>
            <li>Provider configuration issues</li>
            <li>Browser compatibility issues</li>
          </ul>
          
          <h2>Next Steps:</h2>
          <ol>
            <li>Open browser developer tools (F12)</li>
            <li>Check the Console tab for errors</li>
            <li>Check the Network tab for failed requests</li>
            <li>Try the navigation links above</li>
          </ol>
        </div>
      </body>
    </html>
  )
}
