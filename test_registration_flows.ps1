#!/usr/bin/env pwsh
# Registration Flow Testing Script

$BaseURL = "http://localhost:8000"
$FrontendURL = "http://localhost:8081"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "REGISTRATION FLOW TESTING" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Student Registration with Phone Formatting
Write-Host "TEST 1: Student Registration" -ForegroundColor Yellow
Write-Host "Testing phone format: 0611154598 -> +27611154598" -ForegroundColor Gray

$studentData = @{
    email = "teststudent_$(Get-Random)@example.com"
    password = "TestPassword123!"
    confirmPassword = "TestPassword123!"
    first_name = "John"
    last_name = "Doe"
    phone = "0611154598"
    id_number = "9001015001088"
    learners_permit_number = "LP123456"
    emergency_contact_name = "Jane Doe"
    emergency_contact_phone = "0821234567"
    address_line1 = "123 Main Street"
    postal_code = "8000"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/auth/register/student" `
        -Method POST `
        -ContentType "application/json" `
        -Body $studentData `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ Student Registration: SUCCESS (Status $($response.StatusCode))" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "   Email: $($result.email)" -ForegroundColor Gray
    Write-Host "   Name: $($result.first_name) $($result.last_name)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Student Registration: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $streamReader.ReadToEnd()
        Write-Host "   Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test 2: Instructor Registration with Phone Formatting
Write-Host "TEST 2: Instructor Registration" -ForegroundColor Yellow
Write-Host "Testing phone format: 06111545498 -> +276111545498" -ForegroundColor Gray

$instructorData = @{
    email = "testinstructor_$(Get-Random)@example.com"
    password = "TestPassword123!"
    confirmPassword = "TestPassword123!"
    first_name = "Jane"
    last_name = "Smith"
    phone = "06111545498"
    id_number = "8512015001055"
    license_number = "ABC123DEF456"
    license_types = @("B", "EB")
    vehicle_make = "Toyota"
    vehicle_model = "Corolla"
    vehicle_year = 2020
    vehicle_color = "White"
    vehicle_registration = "ABC123GP"
    rate_per_hour = 350.00
    rate_per_km = 7.50
    radius_km = 25.0
    rate_per_km_beyond_radius = 10.00
    service_description = "Professional driving instruction"
    experience_years = 5
    address_line1 = "456 Oak Avenue"
    postal_code = "8001"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/auth/register/instructor" `
        -Method POST `
        -ContentType "application/json" `
        -Body $instructorData `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ Instructor Registration: SUCCESS (Status $($response.StatusCode))" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "   Email: $($result.email)" -ForegroundColor Gray
    Write-Host "   Name: $($result.first_name) $($result.last_name)" -ForegroundColor Gray
    Write-Host "   Licensed for: $(($result.license_types -join ', '))" -ForegroundColor Gray
} catch {
    Write-Host "❌ Instructor Registration: FAILED" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $streamReader.ReadToEnd()
        Write-Host "   Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: CORS Preflight for Student Registration
Write-Host "TEST 3: CORS Preflight Request" -ForegroundColor Yellow
Write-Host "Testing OPTIONS endpoint for /auth/register/student" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/auth/register/student" `
        -Method OPTIONS `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ CORS Preflight: SUCCESS (Status $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   Access-Control-Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Gray
    Write-Host "   Access-Control-Allow-Methods: $($response.Headers['Access-Control-Allow-Methods'])" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  CORS Preflight: Check response" -ForegroundColor Yellow
    Write-Host "   Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Login with Created Student Account
Write-Host "TEST 4: Login Flow (using first created student)" -ForegroundColor Yellow

$loginData = @{
    email = $studentData.email
    password = "TestPassword123!"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$BaseURL/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "✅ Login: SUCCESS (Status $($response.StatusCode))" -ForegroundColor Green
    $result = $response.Content | ConvertFrom-Json
    Write-Host "   Access Token: $($result.access_token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "   Token Type: $($result.token_type)" -ForegroundColor Gray
    Write-Host "   User Role: $($result.role)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Login: Check if student email or password issues" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $streamReader.ReadToEnd()
        Write-Host "   Details: $errorBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend URL: $FrontendURL" -ForegroundColor Cyan
Write-Host "Backend API: $BaseURL" -ForegroundColor Cyan
Write-Host "Open Edge Dev Tools (F12) to monitor:" -ForegroundColor Cyan
Write-Host "   - Network tab: Check phone formatting in requests" -ForegroundColor Gray
Write-Host "   - Console tab: Check for any JavaScript errors" -ForegroundColor Gray
Write-Host "   - Application tab: Check stored tokens/data" -ForegroundColor Gray
Write-Host ""
