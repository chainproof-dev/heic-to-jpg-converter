# HEIC to JPG API Tests - PowerShell Version
# Run these tests against the deployed Cloudflare Worker

# Configuration
$API_BASE = "https://heic-to-jpg-api.chainproof.workers.dev"
$SAMPLE_FILE = "$PSScriptRoot\sample.heic"
$OUTPUT_DIR = "$PSScriptRoot\output"

# Create output directory
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

Write-Host "========================================"
Write-Host "  HEIC to JPG API Tests"
Write-Host "========================================"
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/health" -Method Get
    if ($response.status -eq "healthy") {
        Write-Host "✓ Health check passed" -ForegroundColor Green
        Write-Host "  Status: $($response.status), Version: $($response.version)"
    } else {
        Write-Host "✗ Health check failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Health check error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Options Endpoint
Write-Host "Test 2: Options Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/options" -Method Get
    if ($response.success -eq $true) {
        Write-Host "✓ Options endpoint passed" -ForegroundColor Green
        Write-Host "  Max file size: $($response.capabilities.maxFileSize.formatted)"
        Write-Host "  Output formats: $($response.capabilities.outputFormats.format -join ', ')"
    } else {
        Write-Host "✗ Options endpoint failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Options error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: API Info (Root)
Write-Host "Test 3: API Info (Root)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_BASE/" -Method Get
    if ($response.name -eq "HEIC to JPG API") {
        Write-Host "✓ Root endpoint passed" -ForegroundColor Green
        Write-Host "  API Version: $($response.version)"
    } else {
        Write-Host "✗ Root endpoint failed" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Root error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Convert HEIC to JPG (default quality)
Write-Host "Test 4: Convert HEIC to JPG (default)" -ForegroundColor Yellow
if (Test-Path $SAMPLE_FILE) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($SAMPLE_FILE)
        $response = Invoke-WebRequest -Uri "$API_BASE/convert" -Method Post `
            -ContentType "application/octet-stream" `
            -Body $fileBytes `
            -OutFile "$OUTPUT_DIR\output_default.jpg"
        
        $outputSize = (Get-Item "$OUTPUT_DIR\output_default.jpg").Length
        Write-Host "✓ Conversion passed" -ForegroundColor Green
        Write-Host "  Input size: $($fileBytes.Length) bytes"
        Write-Host "  Output size: $outputSize bytes"
    } catch {
        Write-Host "✗ Conversion failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Sample file not found: $SAMPLE_FILE" -ForegroundColor Red
}
Write-Host ""

# Test 5: Convert with quality parameter
Write-Host "Test 5: Convert with quality=80" -ForegroundColor Yellow
if (Test-Path $SAMPLE_FILE) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($SAMPLE_FILE)
        $response = Invoke-WebRequest -Uri "$API_BASE/convert?quality=80" -Method Post `
            -ContentType "application/octet-stream" `
            -Body $fileBytes `
            -OutFile "$OUTPUT_DIR\output_q80.jpg"
        
        Write-Host "✓ Quality parameter test passed" -ForegroundColor Green
        $headers = $response.Headers
        if ($headers.'X-Processing-Time') {
            Write-Host "  Processing time: $($headers.'X-Processing-Time')"
        }
    } catch {
        Write-Host "✗ Quality test failed: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Test 6: Convert to WebP format
Write-Host "Test 6: Convert to WebP format" -ForegroundColor Yellow
if (Test-Path $SAMPLE_FILE) {
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($SAMPLE_FILE)
        $response = Invoke-WebRequest -Uri "$API_BASE/convert?format=webp&quality=85" -Method Post `
            -ContentType "application/octet-stream" `
            -Body $fileBytes `
            -OutFile "$OUTPUT_DIR\output.webp"
        
        Write-Host "✓ WebP format test passed" -ForegroundColor Green
    } catch {
        Write-Host "✗ WebP test failed: $_" -ForegroundColor Red
    }
}
Write-Host ""

# Test 7: Invalid file (non-HEIC)
Write-Host "Test 7: Invalid file test" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_BASE/convert" -Method Post `
        -ContentType "application/octet-stream" `
        -Body "not a valid heic file"
    Write-Host "✗ Expected error for invalid file" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Invalid file correctly rejected (HTTP 400)" -ForegroundColor Green
    } else {
        Write-Host "✗ Unexpected status: $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

# Test 8: 404 for unknown route
Write-Host "Test 8: 404 for unknown route" -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$API_BASE/unknown/route" -Method Get
    Write-Host "✗ Expected 404" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.Value__
    if ($statusCode -eq 404) {
        Write-Host "✓ Unknown route returns 404" -ForegroundColor Green
    } else {
        Write-Host "✗ Expected 404, got $statusCode" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "========================================"
Write-Host "  Tests Complete"
Write-Host "========================================"
Write-Host "  Output files saved to: $OUTPUT_DIR\"
