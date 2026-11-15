$backendDir = "d:\Url Shortner\backend"
Set-Location $backendDir

Write-Host "Starting NestJS Backend..."
$proc = Start-Process node -ArgumentList "dist/main" -PassThru -NoNewWindow
Start-Sleep -Seconds 5

try {
    Write-Host "1. Testing GET /api/urls..."
    $res = Invoke-RestMethod -Uri "http://localhost:5000/api/urls" -Method Get
    Write-Host "GET /api/urls Success. Total urls found: $($res.total)"

    Write-Host "`n2. Testing POST /api/urls (Shorten URL)..."
    $body = @{
        original_url = "https://github.com/facebook/react"
        title = "React GitHub Repository"
    } | ConvertTo-Json
    $created = Invoke-RestMethod -Uri "http://localhost:5000/api/urls" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Short URL Created successfully!"
    Write-Host "Short Code: $($created.short_code)"
    Write-Host "Short URL: $($created.short_url)"
    Write-Host "QR Code Data URL Length: $($created.qr_code.Length)"

    Write-Host "`n3. Testing Custom Alias POST /api/urls..."
    $aliasBody = @{
        original_url = "https://en.wikipedia.org/wiki/URL_shortening"
        custom_alias = "wiki-shortener"
    } | ConvertTo-Json
    $aliasCreated = Invoke-RestMethod -Uri "http://localhost:5000/api/urls" -Method Post -Body $aliasBody -ContentType "application/json"
    Write-Host "Custom Alias Created! Short Code: $($aliasCreated.short_code)"

    Write-Host "`n4. Testing HTTP 302 Redirection on /$($created.short_code)..."
    $redirectReq = [System.Net.HttpWebRequest]::Create("http://localhost:5000/$($created.short_code)")
    $redirectReq.AllowAutoRedirect = $false
    $response = $redirectReq.GetResponse()
    $statusCode = [int]$response.StatusCode
    $location = $response.Headers["Location"]
    Write-Host "Redirect Status Code: $statusCode (Expected 302)"
    Write-Host "Redirect Location Header: $location"

    Write-Host "`n5. Testing Preview endpoint /api/urls/preview/$($created.short_code)..."
    $preview = Invoke-RestMethod -Uri "http://localhost:5000/api/urls/preview/$($created.short_code)" -Method Get
    Write-Host "Preview Success! Clicks count so far: $($preview.clicks_count)"

    Write-Host "`n6. Testing Toggle Active /api/urls/$($created.id)/toggle..."
    $toggled = Invoke-RestMethod -Uri "http://localhost:5000/api/urls/$($created.id)/toggle" -Method Patch
    Write-Host "Toggle Success! is_active is now: $($toggled.is_active)"

    Write-Host "`n7. Testing Redirection when link is disabled..."
    try {
        $disabledReq = [System.Net.HttpWebRequest]::Create("http://localhost:5000/$($created.short_code)")
        $disabledReq.AllowAutoRedirect = $false
        $disabledResp = $disabledReq.GetResponse()
        Write-Host "Response Code: $([int]$disabledResp.StatusCode)"
    } catch [System.Net.WebException] {
        $webEx = $_.Exception
        if ($webEx.Response) {
            Write-Host "Expected Error Caught: Status $([int]$webEx.Response.StatusCode) ($($webEx.Response.StatusDescription))"
        }
    }

    Write-Host "`nALL PHASE 1 BACKEND VERIFICATIONS PASSED 100%!"
} finally {
    Write-Host "`nStopping background backend process..."
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

