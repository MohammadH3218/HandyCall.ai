# HandyCall Environment Variables Sync Script
# Compares local requirements with AWS services and updates missing variables

Write-Host "🔍 HandyCall Environment Variables Audit" -ForegroundColor Cyan
Write-Host ""

# Required environment variables from codebase
$requiredVars = @{
    # Backend - Core
    "NODE_ENV" = "production"
    "PORT" = "8080"
    "API_PREFIX" = "api/v1"
    "CORS_ORIGINS" = "https://master.dwonwh39izoea.amplifyapp.com,https://handycall.org,https://www.handycall.org"
    
    # Backend - JWT
    "JWT_SECRET" = "REQUIRED_BUT_SECRET" # User should set
    "JWT_EXPIRES_IN" = "3600"
    "REFRESH_TOKEN_SECRET" = "REQUIRED_BUT_SECRET" # User should set
    "REFRESH_TOKEN_EXPIRES_IN" = "2592000"
    
    # Backend - AWS
    "AWS_REGION" = "us-east-1"
    "DYNAMODB_TABLE_PREFIX" = "handycall_prod_"
    "S3_BUCKET_RECORDINGS" = "handycall-recordings-prod"
    "S3_BUCKET_TRANSCRIPTS" = "handycall-transcripts-prod"
    
    # Backend - Bedrock
    "BEDROCK_MODEL_ID" = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    "BEDROCK_EMBEDDING_MODEL_ID" = "amazon.titan-embed-text-v1"
    
    # Backend - Cognito (from Beanstalk)
    "AWS_COGNITO_USERS_POOL_ID" = "us-east-1_gBsGtRPnM"
    "AWS_COGNITO_USERS_CLIENT_ID" = "3vhh0artoakoardoi4e9rdm3m9"
    "AWS_COGNITO_USERS_CLIENT_SECRET" = "8o80uspsmcio3l3djrdnipfherabr8qj6g7jv8jmjhqo2v92cdg"
    "AWS_COGNITO_ADMIN_POOL_ID" = "us-east-1_87I5bQxUW"
    "AWS_COGNITO_ADMIN_CLIENT_ID" = "3drpp2cjdgtkodoj0d3udh5nu1"
    "AWS_COGNITO_ADMIN_CLIENT_SECRET" = "1cue7s8otm0dhtc2davjd0o3p2fuu1k52si7jfvlvd54r9l8rrib"
    
    # Backend - Optional
    "TELEPHONY_PROVIDER" = "amazon_connect"
}

# Lambda: call-orchestrator
$lambdaOrchestratorVars = @{
    "DYNAMODB_TABLE_PREFIX" = "handycall_prod_"
    "BEDROCK_EMBEDDING_MODEL_ID" = "amazon.titan-embed-text-v1"
    "BEDROCK_MODEL_ID" = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}

# Lambda: post-call-processor
$lambdaPostCallVars = @{
    "S3_BUCKET_TRANSCRIPTS" = "handycall-transcripts-prod"
    "BEDROCK_HAIKU_MODEL_ID" = "anthropic.claude-3-haiku-20240307-v1:0"
    "DYNAMODB_TABLE_PREFIX" = "handycall_prod_"
}

$BEANSTALK_APP = "handycall-api"
$BEANSTALK_ENV = "handycall-api-docker"
$LAMBDA_ORCHESTRATOR = "handycall-call-orchestrator"
$LAMBDA_POST_CALL = "handycall-post-call-processor"

# Function to get current Beanstalk env vars
function Get-BeanstalkEnvVars {
    Write-Host "📋 Checking Elastic Beanstalk environment variables..." -ForegroundColor Yellow
    $envVars = aws elasticbeanstalk describe-configuration-settings `
        --application-name $BEANSTALK_APP `
        --environment-name $BEANSTALK_ENV `
        --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:application:environment`]' `
        --output json | ConvertFrom-Json
    
    $result = @{}
    foreach ($var in $envVars) {
        $result[$var.OptionName] = $var.Value
    }
    return $result
}

# Function to update Beanstalk env var
function Update-BeanstalkEnvVar {
    param($Name, $Value)
    
    Write-Host "  Updating $Name..." -ForegroundColor Gray
    aws elasticbeanstalk update-environment `
        --application-name $BEANSTALK_APP `
        --environment-name $BEANSTALK_ENV `
        --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=$Name,Value=$Value" `
        --output json | Out-Null
}

# Function to get Lambda env vars
function Get-LambdaEnvVars {
    param($FunctionName)
    
    $config = aws lambda get-function-configuration `
        --function-name $FunctionName `
        --query 'Environment.Variables' `
        --output json | ConvertFrom-Json
    
    return $config
}

# Function to update Lambda env vars
function Update-LambdaEnvVars {
    param($FunctionName, $EnvVars)
    
    $envJson = $EnvVars | ConvertTo-Json -Compress
    $envBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($envJson))
    
    Write-Host "  Updating $FunctionName..." -ForegroundColor Gray
    aws lambda update-function-configuration `
        --function-name $FunctionName `
        --environment "Variables=$envJson" `
        --output json | Out-Null
}

# Check Beanstalk
Write-Host "🔍 Step 1: Checking Elastic Beanstalk..." -ForegroundColor Cyan
$beanstalkVars = Get-BeanstalkEnvVars
$beanstalkMissing = @{}
$beanstalkMismatch = @{}

foreach ($key in $requiredVars.Keys) {
    if (-not $beanstalkVars.ContainsKey($key)) {
        if ($requiredVars[$key] -ne "REQUIRED_BUT_SECRET") {
            $beanstalkMissing[$key] = $requiredVars[$key]
        }
    } elseif ($beanstalkVars[$key] -ne $requiredVars[$key] -and $requiredVars[$key] -ne "REQUIRED_BUT_SECRET") {
        # Check if it's a significant difference (not just secrets)
        if ($key -eq "BEDROCK_MODEL_ID" -and $beanstalkVars[$key] -ne $requiredVars[$key]) {
            $beanstalkMismatch[$key] = @{
                Current = $beanstalkVars[$key]
                Required = $requiredVars[$key]
            }
        }
    }
}

Write-Host "  ✅ Found $($beanstalkVars.Count) environment variables" -ForegroundColor Green

if ($beanstalkMissing.Count -gt 0) {
    Write-Host "  ⚠️  Missing: $($beanstalkMissing.Keys -join ', ')" -ForegroundColor Yellow
}

if ($beanstalkMismatch.Count -gt 0) {
    Write-Host "  ⚠️  Mismatches:" -ForegroundColor Yellow
    foreach ($key in $beanstalkMismatch.Keys) {
        Write-Host "    - $key" -ForegroundColor Yellow
        Write-Host "      Current: $($beanstalkMismatch[$key].Current)" -ForegroundColor Gray
        Write-Host "      Required: $($beanstalkMismatch[$key].Required)" -ForegroundColor Gray
    }
}

# Check Lambda: call-orchestrator
Write-Host ""
Write-Host "🔍 Step 2: Checking Lambda: $LAMBDA_ORCHESTRATOR..." -ForegroundColor Cyan
$lambdaOrchVars = Get-LambdaEnvVars $LAMBDA_ORCHESTRATOR
$lambdaOrchMissing = @{}

foreach ($key in $lambdaOrchestratorVars.Keys) {
    if (-not $lambdaOrchVars.PSObject.Properties.Name -contains $key) {
        $lambdaOrchMissing[$key] = $lambdaOrchestratorVars[$key]
    } elseif ($lambdaOrchVars.$key -ne $lambdaOrchestratorVars[$key]) {
        Write-Host "  ⚠️  $key mismatch: $($lambdaOrchVars.$key) vs $($lambdaOrchestratorVars[$key])" -ForegroundColor Yellow
    }
}

Write-Host "  ✅ Found $($lambdaOrchVars.PSObject.Properties.Count) environment variables" -ForegroundColor Green

if ($lambdaOrchMissing.Count -gt 0) {
    Write-Host "  ⚠️  Missing: $($lambdaOrchMissing.Keys -join ', ')" -ForegroundColor Yellow
}

# Check Lambda: post-call-processor
Write-Host ""
Write-Host "🔍 Step 3: Checking Lambda: $LAMBDA_POST_CALL..." -ForegroundColor Cyan
$lambdaPostVars = Get-LambdaEnvVars $LAMBDA_POST_CALL
$lambdaPostMissing = @{}

foreach ($key in $lambdaPostCallVars.Keys) {
    if (-not $lambdaPostVars.PSObject.Properties.Name -contains $key) {
        $lambdaPostMissing[$key] = $lambdaPostCallVars[$key]
    } elseif ($lambdaPostVars.$key -ne $lambdaPostCallVars[$key]) {
        Write-Host "  ⚠️  $key mismatch: $($lambdaPostVars.$key) vs $($lambdaPostCallVars[$key])" -ForegroundColor Yellow
    }
}

Write-Host "  ✅ Found $($lambdaPostVars.PSObject.Properties.Count) environment variables" -ForegroundColor Green

if ($lambdaPostMissing.Count -gt 0) {
    Write-Host "  ⚠️  Missing: $($lambdaPostMissing.Keys -join ', ')" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "  Beanstalk: $($beanstalkVars.Count) vars, $($beanstalkMissing.Count) missing, $($beanstalkMismatch.Count) mismatched" -ForegroundColor White
Write-Host "  Lambda Orchestrator: $($lambdaOrchVars.PSObject.Properties.Count) vars, $($lambdaOrchMissing.Count) missing" -ForegroundColor White
Write-Host "  Lambda Post-Call: $($lambdaPostVars.PSObject.Properties.Count) vars, $($lambdaPostMissing.Count) missing" -ForegroundColor White

# Offer to fix
if ($beanstalkMissing.Count -gt 0 -or $beanstalkMismatch.Count -gt 0 -or $lambdaOrchMissing.Count -gt 0 -or $lambdaPostMissing.Count -gt 0) {
    Write-Host ""
    $update = Read-Host "Would you like to update missing/mismatched variables? (y/N)"
    
    if ($update -eq "y" -or $update -eq "Y") {
        Write-Host ""
        Write-Host "🔄 Updating environment variables..." -ForegroundColor Cyan
        
        # Update Beanstalk
        if ($beanstalkMissing.Count -gt 0 -or $beanstalkMismatch.Count -gt 0) {
            Write-Host "  Updating Elastic Beanstalk..." -ForegroundColor Yellow
            $allVars = $beanstalkVars.Clone()
            foreach ($key in $beanstalkMissing.Keys) {
                $allVars[$key] = $requiredVars[$key]
            }
            foreach ($key in $beanstalkMismatch.Keys) {
                $allVars[$key] = $requiredVars[$key]
            }
            
            # Build option-settings string
            $optionSettings = @()
            foreach ($key in $allVars.Keys) {
                $optionSettings += "Namespace=aws:elasticbeanstalk:application:environment,OptionName=$key,Value=$($allVars[$key])"
            }
            
            aws elasticbeanstalk update-environment `
                --application-name $BEANSTALK_APP `
                --environment-name $BEANSTALK_ENV `
                --option-settings $optionSettings `
                --output json | Out-Null
            Write-Host "    ✅ Updated" -ForegroundColor Green
        }
        
        # Update Lambda orchestrator
        if ($lambdaOrchMissing.Count -gt 0) {
            Write-Host "  Updating Lambda: $LAMBDA_ORCHESTRATOR..." -ForegroundColor Yellow
            $mergedVars = @{}
            foreach ($prop in $lambdaOrchVars.PSObject.Properties) {
                $mergedVars[$prop.Name] = $prop.Value
            }
            foreach ($key in $lambdaOrchMissing.Keys) {
                $mergedVars[$key] = $lambdaOrchestratorVars[$key]
            }
            Update-LambdaEnvVars $LAMBDA_ORCHESTRATOR $mergedVars
            Write-Host "    ✅ Updated" -ForegroundColor Green
        }
        
        # Update Lambda post-call
        if ($lambdaPostMissing.Count -gt 0) {
            Write-Host "  Updating Lambda: $LAMBDA_POST_CALL..." -ForegroundColor Yellow
            $mergedVars = @{}
            foreach ($prop in $lambdaPostVars.PSObject.Properties) {
                $mergedVars[$prop.Name] = $prop.Value
            }
            foreach ($key in $lambdaPostMissing.Keys) {
                $mergedVars[$key] = $lambdaPostCallVars[$key]
            }
            Update-LambdaEnvVars $LAMBDA_POST_CALL $mergedVars
            Write-Host "    ✅ Updated" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "✅ All updates complete!" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "✅ All environment variables are properly configured!" -ForegroundColor Green
}

Write-Host ""

