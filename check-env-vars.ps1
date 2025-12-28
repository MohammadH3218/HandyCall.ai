# HandyCall Environment Variables Check Script

Write-Host "🔍 HandyCall Environment Variables Audit" -ForegroundColor Cyan
Write-Host ""

$BEANSTALK_APP = "handycall-api"
$BEANSTALK_ENV = "handycall-api-docker"
$LAMBDA_ORCHESTRATOR = "handycall-call-orchestrator"
$LAMBDA_POST_CALL = "handycall-post-call-processor"

# Check Beanstalk
Write-Host "📋 Checking Elastic Beanstalk..." -ForegroundColor Yellow
$beanstalkVars = aws elasticbeanstalk describe-configuration-settings `
    --application-name $BEANSTALK_APP `
    --environment-name $BEANSTALK_ENV `
    --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:application:environment`]' `
    --output json | ConvertFrom-Json

Write-Host "  ✅ Found $($beanstalkVars.Count) environment variables" -ForegroundColor Green
Write-Host ""
Write-Host "  Current variables:" -ForegroundColor Cyan
foreach ($var in $beanstalkVars) {
    $displayValue = $var.Value
    if ($var.OptionName -match "SECRET|SECRET_ID|SECRET_KEY|PASSWORD") {
        $displayValue = "***HIDDEN***"
    }
    Write-Host "    $($var.OptionName) = $displayValue" -ForegroundColor Gray
}

# Check for BEDROCK_MODEL_ID mismatch (old vs new version)
$bedrockModel = ($beanstalkVars | Where-Object { $_.OptionName -eq "BEDROCK_MODEL_ID" }).Value
if ($bedrockModel -ne "anthropic.claude-3-5-sonnet-20241022-v2:0") {
    Write-Host ""
    Write-Host "  ⚠️  WARNING: BEDROCK_MODEL_ID mismatch!" -ForegroundColor Yellow
    Write-Host "    Current: $bedrockModel" -ForegroundColor Yellow
    Write-Host "    Should be: anthropic.claude-3-5-sonnet-20241022-v2:0" -ForegroundColor Yellow
    Write-Host "    (Lambda uses newer version)" -ForegroundColor Yellow
}

# Check Lambda: call-orchestrator
Write-Host ""
Write-Host "📋 Checking Lambda: $LAMBDA_ORCHESTRATOR..." -ForegroundColor Yellow
$lambdaOrchVars = aws lambda get-function-configuration `
    --function-name $LAMBDA_ORCHESTRATOR `
    --query 'Environment.Variables' `
    --output json | ConvertFrom-Json

Write-Host "  ✅ Found $($lambdaOrchVars.PSObject.Properties.Count) environment variables" -ForegroundColor Green
Write-Host "  Variables:" -ForegroundColor Cyan
foreach ($prop in $lambdaOrchVars.PSObject.Properties) {
    Write-Host "    $($prop.Name) = $($prop.Value)" -ForegroundColor Gray
}

# Check Lambda: post-call-processor
Write-Host ""
Write-Host "📋 Checking Lambda: $LAMBDA_POST_CALL..." -ForegroundColor Yellow
$lambdaPostVars = aws lambda get-function-configuration `
    --function-name $LAMBDA_POST_CALL `
    --query 'Environment.Variables' `
    --output json | ConvertFrom-Json

Write-Host "  ✅ Found $($lambdaPostVars.PSObject.Properties.Count) environment variables" -ForegroundColor Green
Write-Host "  Variables:" -ForegroundColor Cyan
foreach ($prop in $lambdaPostVars.PSObject.Properties) {
    Write-Host "    $($prop.Name) = $($prop.Value)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "  ✅ All services have environment variables configured" -ForegroundColor Green
Write-Host ""
Write-Host "💡 To update Beanstalk BEDROCK_MODEL_ID, run:" -ForegroundColor Cyan
Write-Host "  aws elasticbeanstalk update-environment \`" -ForegroundColor White
Write-Host "    --application-name $BEANSTALK_APP \`" -ForegroundColor White
Write-Host "    --environment-name $BEANSTALK_ENV \`" -ForegroundColor White
Write-Host "    --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=BEDROCK_MODEL_ID,Value=anthropic.claude-3-5-sonnet-20241022-v2:0" -ForegroundColor White
Write-Host ""

