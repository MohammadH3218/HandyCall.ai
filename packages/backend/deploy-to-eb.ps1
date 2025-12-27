# Simplified Elastic Beanstalk Deployment Script
# Deploys HandyCall backend to AWS Elastic Beanstalk

$ErrorActionPreference = "Stop"

# Configuration
$APP_NAME = "handycall-api"
$ENV_NAME = "handycall-api-prod"
$REGION = "us-east-1"
$SOLUTION_STACK = "64bit Amazon Linux 2023 v6.1.2 running Node.js 20"

Write-Host "========================================"
Write-Host "HandyCall EB Deployment" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Step 1: Create Application if needed
Write-Host "Step 1: Checking application..." -ForegroundColor Cyan
$appCheck = aws elasticbeanstalk describe-applications --application-names $APP_NAME --region $REGION 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating application $APP_NAME..." -ForegroundColor Yellow
    aws elasticbeanstalk create-application --application-name $APP_NAME --description "HandyCall API Backend" --region $REGION
    Write-Host "Application created" -ForegroundColor Green
} else {
    Write-Host "Application exists" -ForegroundColor Green
}

# Step 2: Build
Write-Host ""
Write-Host "Step 2: Building..." -ForegroundColor Cyan
Push-Location ../shared
npm install --silent 2>$null
npm run build
Pop-Location

npm install --silent 2>$null
npm run build
Write-Host "Build complete" -ForegroundColor Green

# Step 3: Package
Write-Host ""
Write-Host "Step 3: Creating package..." -ForegroundColor Cyan
if (Test-Path deploy.zip) { Remove-Item deploy.zip -Force }

# For monorepo, we need to copy root node_modules
Write-Host "  Copying root node_modules..." -ForegroundColor Yellow
$tempDir = "deploy_temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy dist, package.json, Procfile
Copy-Item -Path "dist" -Destination "$tempDir/dist" -Recurse -Force
Copy-Item -Path "package.json" -Destination "$tempDir/package.json" -Force
if (Test-Path "Procfile") { Copy-Item -Path "Procfile" -Destination "$tempDir/Procfile" -Force }
if (Test-Path "package-lock.json") { Copy-Item -Path "package-lock.json" -Destination "$tempDir/package-lock.json" -Force }
if (Test-Path ".npmrc") { Copy-Item -Path ".npmrc" -Destination "$tempDir/.npmrc" -Force }

# Copy root node_modules (monorepo dependencies)
Write-Host "  Copying root node_modules (this may take a while)..." -ForegroundColor Yellow
$rootNodeModules = "../../node_modules"
if (Test-Path $rootNodeModules) {
    Copy-Item -Path $rootNodeModules -Destination "$tempDir/node_modules" -Recurse -Force
} else {
    Write-Host "  Warning: Root node_modules not found, using local node_modules" -ForegroundColor Yellow
    if (Test-Path "node_modules") {
        Copy-Item -Path "node_modules" -Destination "$tempDir/node_modules" -Recurse -Force
    }
}

# Create zip with forward slashes (Windows compatibility)
Write-Host "  Creating zip file..." -ForegroundColor Yellow
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Resolve-Path "deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

Get-ChildItem -Path $tempDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring((Resolve-Path $tempDir).Path.Length + 1)
    $relativePath = $relativePath.Replace('\', '/')  # Use forward slashes
    if (-not $_.PSIsContainer) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relativePath) | Out-Null
    }
}

$zip.Dispose()
Remove-Item $tempDir -Recurse -Force

$size = (Get-Item deploy.zip).Length / 1MB
Write-Host "Package created: $([math]::Round($size, 2)) MB" -ForegroundColor Green

# Step 4: Upload
Write-Host ""
Write-Host "Step 4: Uploading..." -ForegroundColor Cyan
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$S3_BUCKET = "elasticbeanstalk-$REGION-$ACCOUNT_ID"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"
$S3_KEY = "$APP_NAME/deploy-$TIMESTAMP.zip"

# Create bucket if needed
aws s3 ls "s3://$S3_BUCKET" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    aws s3 mb "s3://$S3_BUCKET" --region $REGION
}

aws s3 cp deploy.zip "s3://$S3_BUCKET/$S3_KEY" --region $REGION --only-show-errors
Write-Host "Upload complete" -ForegroundColor Green

# Step 5: Create version
Write-Host ""
Write-Host "Step 5: Creating app version..." -ForegroundColor Cyan
$VERSION_LABEL = "v-$TIMESTAMP"
aws elasticbeanstalk create-application-version --application-name $APP_NAME --version-label $VERSION_LABEL --source-bundle "S3Bucket=$S3_BUCKET,S3Key=$S3_KEY" --region $REGION --no-cli-pager
Write-Host "Version created: $VERSION_LABEL" -ForegroundColor Green

# Step 6: Deploy
Write-Host ""
Write-Host "Step 6: Deploying..." -ForegroundColor Cyan

$envCheck = aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION 2>&1
if ($LASTEXITCODE -ne 0 -or $envCheck -like "*No Environment found*") {
    Write-Host "Creating new environment (this takes 5-10 minutes)..." -ForegroundColor Yellow

    # Read .env file
    $envVars = @{}
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.+)$') {
            $envVars[$matches[1].Trim()] = $matches[2].Trim()
        }
    }

    aws elasticbeanstalk create-environment `
        --application-name $APP_NAME `
        --environment-name $ENV_NAME `
        --solution-stack-name $SOLUTION_STACK `
        --version-label $VERSION_LABEL `
        --region $REGION `
        --option-settings `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=API_PREFIX,Value=api/v1" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_SECRET,Value=$($envVars.JWT_SECRET)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=JWT_EXPIRES_IN,Value=$($envVars.JWT_EXPIRES_IN)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=REFRESH_TOKEN_SECRET,Value=$($envVars.REFRESH_TOKEN_SECRET)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=REFRESH_TOKEN_EXPIRES_IN,Value=$($envVars.REFRESH_TOKEN_EXPIRES_IN)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value=$($envVars.AWS_REGION)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_USERS_POOL_ID,Value=$($envVars.AWS_COGNITO_USERS_POOL_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_USERS_CLIENT_ID,Value=$($envVars.AWS_COGNITO_USERS_CLIENT_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_USERS_CLIENT_SECRET,Value=$($envVars.AWS_COGNITO_USERS_CLIENT_SECRET)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_ADMIN_POOL_ID,Value=$($envVars.AWS_COGNITO_ADMIN_POOL_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_ADMIN_CLIENT_ID,Value=$($envVars.AWS_COGNITO_ADMIN_CLIENT_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_COGNITO_ADMIN_CLIENT_SECRET,Value=$($envVars.AWS_COGNITO_ADMIN_CLIENT_SECRET)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=DYNAMODB_TABLE_PREFIX,Value=handycall_prod_" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=S3_BUCKET_RECORDINGS,Value=handycall-recordings-prod" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=S3_BUCKET_TRANSCRIPTS,Value=handycall-transcripts-prod" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=BEDROCK_MODEL_ID,Value=$($envVars.BEDROCK_MODEL_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=BEDROCK_EMBEDDING_MODEL_ID,Value=$($envVars.BEDROCK_EMBEDDING_MODEL_ID)" `
            "Namespace=aws:elasticbeanstalk:application:environment,OptionName=CORS_ORIGINS,Value=https://master.dwonwh39izoea.amplifyapp.com" `
            "Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role" `
            "Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance" `
        --no-cli-pager

    Write-Host "Environment creation started!" -ForegroundColor Green
} else {
    Write-Host "Updating existing environment..." -ForegroundColor Yellow
    aws elasticbeanstalk update-environment --application-name $APP_NAME --environment-name $ENV_NAME --version-label $VERSION_LABEL --region $REGION --no-cli-pager
    Write-Host "Environment update started!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment initiated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Check status with:" -ForegroundColor Yellow
Write-Host "  aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION" -ForegroundColor White
Write-Host ""
Write-Host "After deployment completes, get URL with:" -ForegroundColor Yellow
Write-Host "  aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --query ""Environments[0].CNAME"" --output text --region $REGION" -ForegroundColor White
Write-Host ""
