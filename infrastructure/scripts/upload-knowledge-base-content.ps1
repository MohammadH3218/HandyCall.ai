# =============================================================================
# Upload Knowledge Base Content Script
# =============================================================================
# This script uploads knowledge base content to the S3 bucket for Bedrock KB
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ContentPath = "",
    
    [Parameter(Mandatory=$false)]
    [string]$BucketName = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Upload Knowledge Base Content" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text 2>$null)
if (-not $AccountId) {
    Write-Host "❌ Error: AWS CLI not configured or no credentials found" -ForegroundColor Red
    exit 1
}

# Get bucket name if not provided
if (-not $BucketName) {
    $BucketName = "handycall-knowledge-base-$AccountId-$Environment"
}

Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Check if bucket exists
$bucketExists = aws s3api head-bucket --bucket $BucketName --region $Region 2>$null
if (-not $bucketExists) {
    Write-Host "❌ Error: Bucket does not exist: $BucketName" -ForegroundColor Red
    Write-Host "   Please deploy the Knowledge Base stack first." -ForegroundColor Yellow
    exit 1
}

# Determine content path
if (-not $ContentPath) {
    # Look for content in reference implementation
    $refContentPath = Join-Path $ProjectRoot "temp-reference\content\content-word"
    if (Test-Path $refContentPath) {
        $ContentPath = $refContentPath
        Write-Host "Using reference content from: $ContentPath" -ForegroundColor Green
    } else {
        Write-Host "❌ Error: Content path not specified and reference content not found" -ForegroundColor Red
        Write-Host "   Usage: .\upload-knowledge-base-content.ps1 -ContentPath <path>" -ForegroundColor Yellow
        exit 1
    }
}

if (-not (Test-Path $ContentPath)) {
    Write-Host "❌ Error: Content path does not exist: $ContentPath" -ForegroundColor Red
    exit 1
}

Write-Host "Uploading content from: $ContentPath" -ForegroundColor Cyan
Write-Host ""

# Upload content to S3
Write-Host "Uploading to s3://$BucketName/..." -ForegroundColor Yellow

# Sync content (preserves folder structure)
aws s3 sync $ContentPath "s3://$BucketName/" --region $Region --exclude "*.DS_Store" --exclude "*.git*"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Content uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Bedrock Console > Knowledge Bases" -ForegroundColor White
    Write-Host "2. Select your knowledge base" -ForegroundColor White
    Write-Host "3. Click on the data source and select 'Sync'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error: Upload failed" -ForegroundColor Red
    exit 1
}


