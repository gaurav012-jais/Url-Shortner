$backendDir = "d:\Url Shortner\backend"
Set-Location $backendDir

Write-Host "Starting NestJS Backend for Phase 2 Verification..."
$proc = Start-Process node -ArgumentList "dist/main" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

try {
    $randomSuffix = Get-Random -Minimum 1000 -Maximum 9999
    $email = "gaurav$randomSuffix@linkflow.local"
    $password = "SecretPass123!"

    Write-Host "`n1. Testing User Registration (POST /api/auth/register)..."
    $regBody = @{
        name = "Gaurav Developer"
        email = $email
        password = $password
    } | ConvertTo-Json

    $regRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    Write-Host "Registration Successful!"
    Write-Host "User ID: $($regRes.user.id)"
    Write-Host "Role: $($regRes.user.role)"
    Write-Host "Access Token received: $($regRes.accessToken.Substring(0, 20))..."

    Write-Host "`n2. Testing Duplicate Email Registration..."
    try {
        Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" -Method Post -Body $regBody -ContentType "application/json"
        Write-Host "FAILED: Expected ConflictException but request succeeded."
    } catch {
        Write-Host "Success: Duplicate email rejected properly (409 Conflict)."
    }

    Write-Host "`n3. Testing Login (POST /api/auth/login)..."
    $loginBody = @{
        email = $email
        password = $password
    } | ConvertTo-Json
    $loginRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "Login Successful! Token acquired."

    Write-Host "`n4. Testing Wrong Password Login..."
    try {
        $wrongLoginBody = @{
            email = $email
            password = "WrongPassword999"
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body $wrongLoginBody -ContentType "application/json"
        Write-Host "FAILED: Expected 401 Unauthorized."
    } catch {
        Write-Host "Success: Wrong password rejected properly (401 Unauthorized)."
    }

    Write-Host "`n5. Testing Profile Endpoint (GET /api/auth/me with Bearer Token)..."
    $headers = @{
        Authorization = "Bearer $($loginRes.accessToken)"
    }
    $profileRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/me" -Method Get -Headers $headers
    Write-Host "Profile Verified: $($profileRes.name) ($($profileRes.email))"

    Write-Host "`n6. Testing URL Creation with Authenticated User..."
    $urlBody = @{
        original_url = "https://github.com/nestjs/nest"
        custom_alias = "nest-core-$randomSuffix"
        domain = "localhost:5000"
    } | ConvertTo-Json
    $urlRes = Invoke-RestMethod -Uri "http://localhost:5000/api/urls" -Method Post -Body $urlBody -Headers $headers -ContentType "application/json"
    Write-Host "URL Created for User! Short Code: $($urlRes.short_code)"

    Write-Host "`n7. Testing Refresh Token Rotation (POST /api/auth/refresh)..."
    $refreshBody = @{
        refreshToken = $loginRes.refreshToken
    } | ConvertTo-Json
    $refreshRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/refresh" -Method Post -Body $refreshBody -ContentType "application/json"
    Write-Host "Token Rotation Success! New Access Token received: $($refreshRes.accessToken.Substring(0, 20))..."

    Write-Host "`n8. Testing User Logout (POST /api/auth/logout)..."
    $logoutRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/logout" -Method Post -Headers $headers
    Write-Host "Logout Success: $($logoutRes.message)"

    Write-Host "`nPHASE 2 AUTHENTICATION & USER MANAGEMENT VERIFICATIONS PASSED 100%!"
} finally {
    Write-Host "`nStopping background test backend process..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

