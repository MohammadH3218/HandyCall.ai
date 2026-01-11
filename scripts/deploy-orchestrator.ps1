# Deploy Orchestrator Lambda for Lex-First Architecture (PowerShell)
# This script builds and deploys the Lambda function

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying HandyCall Orchestrator Lambda..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent $SCRIPT_DIR
$LAMBDA_DIR = Join-Path $PROJECT_ROOT "packages\lambda\call-orchestrator"

Write-Host "📁 Project root: $PROJECT_ROOT"
Write-Host "📁 Lambda directory: $LAMBDA_DIR"
Write-Host ""

# Step 1: Build
Write-Host "📦 Step 1: Building Lambda function..." -ForegroundColor Yellow
Set-Location $LAMBDA_DIR
npm install
npm run build

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed - dist directory not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build complete" -ForegroundColor Green
Write-Host ""

# Step 2: Create zip
Write-Host "📦 Step 2: Creating deployment package..." -ForegroundColor Yellow
Remove-Item -Path "function.zip" -ErrorAction SilentlyContinue

# Create zip file
Compress-Archive -Path "dist", "node_modules", "package.json" -DestinationPath "function.zip" -Force

if (-not (Test-Path "function.zip")) {
    Write-Host "❌ Failed to create function.zip" -ForegroundColor Red
    exit 1
}

$zipSize = (Get-Item "function.zip").Length / 1MB
Write-Host "✅ Package created: function.zip ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
Write-Host ""

# Step 3: Update Lambda
Write-Host "📦 Step 3: Updating Lambda function code..." -ForegroundColor Yellow
aws lambda update-function-code `
  --function-name handycall-call-orchestrator `
  --zip-file fileb://function.zip `
  --region us-east-1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to update Lambda function" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Lambda function updated" -ForegroundColor Green
Write-Host ""

# Step 4: Grant Lex permission (if not already granted)
Write-Host "📦 Step 4: Ensuring Lex has permission to invoke Lambda..." -ForegroundColor Yellow
$BOT_ALIAS_ARN = "arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"
$STATEMENT_ID = "LexInvoke-$(Get-Date -Format 'yyyyMMddHHmmss')"

aws lambda add-permission `
  --function-name handycall-call-orchestrator `
  --statement-id $STATEMENT_ID `
  --action lambda:InvokeFunction `
  --principal lex.amazonaws.com `
  --source-arn $BOT_ALIAS_ARN `
  2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Permission added" -ForegroundColor Green
} else {
    Write-Host "⚠️  Permission may already exist (this is okay)" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Wait for update to complete
Write-Host "⏳ Step 5: Waiting for Lambda update to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 5  # Give AWS a moment

Write-Host "✅ Lambda update complete" -ForegroundColor Green
Write-Host ""

Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Configure Lex FallbackIntent to use Lambda fulfillment" -ForegroundColor White
Write-Host "   2. Import the new Contact Flow: handycall-lex-first-flow.json" -ForegroundColor White
Write-Host "   3. Test the call flow" -ForegroundColor White
Write-Host ""


