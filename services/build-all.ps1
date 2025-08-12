# EliteePay Microservices Build Script
# This script builds all microservices and validates the integration

Write-Host "🚀 Building EliteePay Microservices..." -ForegroundColor Green
Write-Host ""

$services = @("shared", "api-gateway", "user-service", "payment-service", "audit-service")
$buildResults = @{}

foreach ($service in $services) {
    Write-Host "📦 Building $service..." -ForegroundColor Yellow
    
    if (Test-Path $service) {
        Set-Location $service
        
        # Install dependencies if node_modules doesn't exist
        if (!(Test-Path "node_modules")) {
            Write-Host "   Installing dependencies..." -ForegroundColor Cyan
            npm install
        }
        
        # Build the service
        $buildOutput = npm run build 2>&1
        $buildSuccess = $LASTEXITCODE -eq 0
        
        if ($buildSuccess) {
            Write-Host "   ✅ $service built successfully" -ForegroundColor Green
            $buildResults[$service] = "SUCCESS"
        } else {
            Write-Host "   ❌ $service build failed" -ForegroundColor Red
            Write-Host "   Error: $buildOutput" -ForegroundColor Red
            $buildResults[$service] = "FAILED"
        }
        
        Set-Location ..
    } else {
        Write-Host "   ⚠️  $service directory not found" -ForegroundColor Yellow
        $buildResults[$service] = "NOT_FOUND"
    }
    
    Write-Host ""
}

# Summary
Write-Host "📊 Build Summary:" -ForegroundColor Magenta
Write-Host "=================" -ForegroundColor Magenta

$successCount = 0
$failedCount = 0

foreach ($service in $services) {
    $status = $buildResults[$service]
    $icon = switch ($status) {
        "SUCCESS" { "✅"; $successCount++ }
        "FAILED" { "❌"; $failedCount++ }
        "NOT_FOUND" { "⚠️"; $failedCount++ }
    }
    
    Write-Host "$icon $service : $status"
}

Write-Host ""
Write-Host "Total: $($services.Count) services" -ForegroundColor White
Write-Host "Success: $successCount" -ForegroundColor Green
Write-Host "Failed: $failedCount" -ForegroundColor Red

if ($failedCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 All services built successfully!" -ForegroundColor Green
    Write-Host "Ready for deployment and testing." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "💥 Some services failed to build. Please check the errors above." -ForegroundColor Red
    exit 1
}
