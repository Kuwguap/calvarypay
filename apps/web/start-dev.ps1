# CalvaryPay Development Server Startup Script
# Starts the Next.js development server with Turbopack for faster compilation

Write-Host "🚀 Starting CalvaryPay Development Server..." -ForegroundColor Green

# Check if port 3005 is available
$portCheck = netstat -ano | findstr :3005 | findstr LISTENING
if ($portCheck) {
    Write-Host "⚠️  Port 3005 is already in use. Attempting to use port 3006..." -ForegroundColor Yellow
    npx next dev -p 3006 --turbo
} else {
    Write-Host "✅ Port 3005 is available. Starting server..." -ForegroundColor Green
    npx next dev -p 3005 --turbo
}
