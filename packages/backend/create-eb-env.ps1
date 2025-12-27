# PowerShell script to create Elastic Beanstalk application and environment

$APP_NAME = "handycall-api"
$ENV_NAME = "handycall-api-prod"
$REGION = "us-east-1"
$SOLUTION_STACK = "64bit Amazon Linux 2023 v6.1.2 running Node.js 20"

Write-Host "🚀 Creating Elastic Beanstalk Application: $APP_NAME" -ForegroundColor Cyan

# Check if application exists
$appExists = aws elasticbeanstalk describe-applications --application-names $APP_NAME --region $REGION 2>&1

if ($appExists -like "*NoSuchApplication*" -or $appExists -like "*error*") {
    Write-Host "📝 Creating new application..." -ForegroundColor Yellow
    aws elasticbeanstalk create-application `
        --application-name $APP_NAME `
        --description "HandyCall API Backend" `
        --region $REGION
    Start-Sleep -Seconds 3
} else {
    Write-Host "✅ Application already exists" -ForegroundColor Green
}

Write-Host "🔨 Building deployment package..." -ForegroundColor Cyan

# Build shared package
Write-Host "  Building shared package..." -ForegroundColor Gray
Push-Location ../shared
npm install
npm run build
Pop-Location

# Build backend
Write-Host "  Building backend..." -ForegroundColor Gray
npm install
npm run build

# Create deployment zip
Write-Host "  Creating zip file..." -ForegroundColor Gray
if (Test-Path deploy.zip) { Remove-Item deploy.zip }
Compress-Archive -Path dist,package.json,package-lock.json,.ebextensions,node_modules -DestinationPath deploy.zip -Force

# Upload to S3 for deployment
$S3_BUCKET = "elasticbeanstalk-$REGION-$(aws sts get-caller-identity --query Account --output text)"
$S3_KEY = "$APP_NAME/deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

Write-Host "☁️  Uploading to S3..." -ForegroundColor Cyan
aws s3 cp deploy.zip "s3://$S3_BUCKET/$S3_KEY" --region $REGION

# Create application version
$VERSION_LABEL = "v-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "📦 Creating application version: $VERSION_LABEL" -ForegroundColor Cyan
aws elasticbeanstalk create-application-version `
    --application-name $APP_NAME `
    --version-label $VERSION_LABEL `
    --source-bundle S3Bucket=$S3_BUCKET,S3Key=$S3_KEY `
    --region $REGION

# Check if environment exists
$envExists = aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION 2>&1

if ($envExists -like "*NoSuchEnvironment*" -or $envExists -like "*error*") {
    Write-Host "🌍 Creating environment: $ENV_NAME" -ForegroundColor Cyan
    Write-Host "   This may take 5-10 minutes..." -ForegroundColor Yellow
    
    aws elasticbeanstalk create-environment `
        --application-name $APP_NAME `
        --environment-name $ENV_NAME `
        --solution-stack-name $SOLUTION_STACK `
        --version-label $VERSION_LABEL `
        --option-settings `
            Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role `
            Namespace=aws:elasticbeanstalk:container:nodejs,OptionName=NodeCommand,Value="npm run start:prod" `
            Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production `
            Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080 `
        --region $REGION
} else {
    Write-Host "🔄 Updating existing environment..." -ForegroundColor Yellow
    aws elasticbeanstalk update-environment `
        --application-name $APP_NAME `
        --environment-name $ENV_NAME `
        --version-label $VERSION_LABEL `
        --region $REGION
}

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host "   Check status: aws elasticbeanstalk describe-environments --application-name $APP_NAME --environment-names $ENV_NAME --region $REGION" -ForegroundColor Gray


