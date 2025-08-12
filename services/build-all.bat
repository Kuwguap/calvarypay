@echo off
echo 🚀 Building EliteePay Microservices...
echo.

set SUCCESS_COUNT=0
set FAILED_COUNT=0

echo 📦 Building shared library...
cd shared
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo    ✅ shared built successfully
    set /a SUCCESS_COUNT+=1
) else (
    echo    ❌ shared build failed
    set /a FAILED_COUNT+=1
)
cd ..
echo.

echo 📦 Building api-gateway...
cd api-gateway
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo    ✅ api-gateway built successfully
    set /a SUCCESS_COUNT+=1
) else (
    echo    ❌ api-gateway build failed
    set /a FAILED_COUNT+=1
)
cd ..
echo.

echo 📦 Building user-service...
cd user-service
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo    ✅ user-service built successfully
    set /a SUCCESS_COUNT+=1
) else (
    echo    ❌ user-service build failed
    set /a FAILED_COUNT+=1
)
cd ..
echo.

echo 📦 Building payment-service...
cd payment-service
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo    ✅ payment-service built successfully
    set /a SUCCESS_COUNT+=1
) else (
    echo    ❌ payment-service build failed
    set /a FAILED_COUNT+=1
)
cd ..
echo.

echo 📦 Building audit-service...
cd audit-service
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo    ✅ audit-service built successfully
    set /a SUCCESS_COUNT+=1
) else (
    echo    ❌ audit-service build failed
    set /a FAILED_COUNT+=1
)
cd ..
echo.

echo 📊 Build Summary:
echo =================
echo Success: %SUCCESS_COUNT%
echo Failed: %FAILED_COUNT%
echo.

if %FAILED_COUNT% EQU 0 (
    echo 🎉 All services built successfully!
    echo Ready for deployment and testing.
    exit /b 0
) else (
    echo 💥 Some services failed to build. Please check the errors above.
    exit /b 1
)
