# =============================================================================
# HandyCall Voice AI Infrastructure Deployment Script
# =============================================================================
# This script deploys the complete AWS infrastructure for HandyCall's AI voice
# receptionist using Amazon Connect, Lex, Bedrock Knowledge Bases, and Lambda.
# Based on: https://github.com/aws-samples/contact-center-genai-agent
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ConnectInstanceArn = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipKnowledgeBase = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$CleanFirst = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "HandyCall Voice AI Infrastructure Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Project Root: $ProjectRoot" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get AWS Account ID
$AccountId = (aws sts get-caller-identity --query Account --output text 2>$null)
if (-not $AccountId) {
    Write-Host "❌ Error: AWS CLI not configured or no credentials found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ AWS Account ID: $AccountId" -ForegroundColor Green
Write-Host ""

# Configuration
$ArtifactsBucket = "handycall-voice-ai-artifacts-$AccountId-$Environment"
$KnowledgeBaseBucket = "handycall-knowledge-base-$AccountId-$Environment"
$StackPrefix = "handycall-voice-ai-$Environment"

$Stacks = @{
    KB = "$StackPrefix-kb"
    RAG = "$StackPrefix-rag"
    Hallucination = "$StackPrefix-hallucination"
    Analytics = "$StackPrefix-analytics"
}

$CloudFormationDir = Join-Path $ProjectRoot "infrastructure\cloudformation"
$ReferenceDir = Join-Path $ProjectRoot "temp-reference"

# =============================================================================
# Step 1: Clean up existing stacks (if requested)
# =============================================================================
if ($CleanFirst) {
    Write-Host "🧹 Cleaning up existing stacks..." -ForegroundColor Yellow
    
    $stackOrder = @($Stacks.RAG, $Stacks.Hallucination, $Stacks.Analytics, $Stacks.KB)
    foreach ($stackName in $stackOrder) {
        Write-Host "   Checking for stack: $stackName" -ForegroundColor Gray
        $stackExists = aws cloudformation describe-stacks --stack-name $stackName --region $Region 2>$null
        if ($stackExists) {
            Write-Host "   Deleting stack: $stackName" -ForegroundColor Yellow
            aws cloudformation delete-stack --stack-name $stackName --region $Region
            Write-Host "   Waiting for deletion..." -ForegroundColor Gray
            aws cloudformation wait stack-delete-complete --stack-name $stackName --region $Region
            Write-Host "   ✅ Stack deleted: $stackName" -ForegroundColor Green
        }
    }
    Write-Host ""
}

# =============================================================================
# Step 2: Create S3 buckets for artifacts and knowledge base
# =============================================================================
Write-Host "📦 Step 1: Creating S3 buckets..." -ForegroundColor Cyan

function Ensure-S3Bucket {
    param([string]$BucketName, [string]$Region)
    
    $bucketExists = aws s3api head-bucket --bucket $BucketName --region $Region 2>$null
    if (-not $bucketExists) {
        Write-Host "   Creating bucket: $BucketName" -ForegroundColor Yellow
        if ($Region -eq "us-east-1") {
            aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
        } else {
            aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region | Out-Null
        }
        
        # Enable versioning
        aws s3api put-bucket-versioning --bucket $BucketName --versioning-configuration Status=Enabled --region $Region | Out-Null
        
        # Block public access
        aws s3api put-public-access-block --bucket $BucketName `
            --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" `
            --region $Region | Out-Null
        
        Write-Host "   ✅ Bucket created: $BucketName" -ForegroundColor Green
    } else {
        Write-Host "   ✅ Bucket already exists: $BucketName" -ForegroundColor Green
    }
}

Ensure-S3Bucket -BucketName $ArtifactsBucket -Region $Region
Ensure-S3Bucket -BucketName $KnowledgeBaseBucket -Region $Region
Write-Host ""

# =============================================================================
# Step 3: Build Lambda functions (if not skipped)
# =============================================================================
if (-not $SkipBuild) {
    Write-Host "🔨 Step 2: Building Lambda functions..." -ForegroundColor Cyan
    
    # Check if Python is available
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Warning: Python not found. Skipping Lambda build." -ForegroundColor Yellow
        Write-Host "   You'll need to build the Lambda functions manually." -ForegroundColor Yellow
        Write-Host "   Run: cd temp-reference\src && bash publish-all.sh" -ForegroundColor Yellow
    } else {
        Write-Host "   Python found: $pythonVersion" -ForegroundColor Green
        
        # Build Lambda functions from reference implementation
        $srcDir = Join-Path $ReferenceDir "src"
        if (Test-Path $srcDir) {
            Push-Location $srcDir
            
            # Check for bash (Git Bash on Windows)
            $bashPath = (Get-Command bash -ErrorAction SilentlyContinue)
            if ($bashPath) {
                Write-Host "   Building Lambda functions..." -ForegroundColor Yellow
                bash publish-all.sh
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✅ Lambda functions built successfully" -ForegroundColor Green
                    
                    # Upload Lambda artifacts to S3
                    $distDir = Join-Path $srcDir "..\dist"
                    if (Test-Path $distDir) {
                        Write-Host "   Uploading Lambda artifacts to S3..." -ForegroundColor Yellow
                        
                        # Upload each Lambda function's artifacts
                        $lambdaDirs = @("connect", "hallucinations", "lex", "opensearch")
                        foreach ($dir in $lambdaDirs) {
                            $lambdaDist = Join-Path $distDir $dir
                            if (Test-Path $lambdaDist) {
                                $s3Prefix = "lambda/$dir/"
                                aws s3 sync $lambdaDist "s3://$ArtifactsBucket/$s3Prefix" --region $Region | Out-Null
                                Write-Host "   ✅ Uploaded: $dir" -ForegroundColor Green
                            }
                        }
                    }
                } else {
                    Write-Host "   ❌ Lambda build failed" -ForegroundColor Red
                    Pop-Location
                    exit 1
                }
            } else {
                Write-Host "   ⚠️  Warning: bash not found. Cannot build Lambda functions." -ForegroundColor Yellow
                Write-Host "   Please install Git Bash or build manually." -ForegroundColor Yellow
            }
            
            Pop-Location
        } else {
            Write-Host "   ⚠️  Warning: Reference source directory not found: $srcDir" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} else {
    Write-Host "⏭️  Step 2: Skipping Lambda build (--SkipBuild specified)" -ForegroundColor Yellow
    Write-Host ""
}

# =============================================================================
# Step 4: Deploy Knowledge Base stack (if not skipped)
# =============================================================================
if (-not $SkipKnowledgeBase) {
    Write-Host "🧠 Step 3: Deploying Bedrock Knowledge Base stack..." -ForegroundColor Cyan
    
    $kbTemplate = Join-Path $CloudFormationDir "bedrock-KB.yaml"
    
    if (-not (Test-Path $kbTemplate)) {
        Write-Host "   ❌ Error: CloudFormation template not found: $kbTemplate" -ForegroundColor Red
        exit 1
    }
    
    # Check if stack already exists
    $stackExists = aws cloudformation describe-stacks --stack-name $Stacks.KB --region $Region 2>$null
    if ($stackExists) {
        Write-Host "   Stack already exists. Updating..." -ForegroundColor Yellow
        $stackAction = "update-stack"
    } else {
        Write-Host "   Creating new stack..." -ForegroundColor Yellow
        $stackAction = "create-stack"
    }
    
    $parameters = @(
        "ParameterKey=pKnowledgeBaseBucketName,ParameterValue=$KnowledgeBaseBucket",
        "ParameterKey=pInputDocumentUploadFolderPrefix,ParameterValue=",
        "ParameterKey=pEmbedModel,ParameterValue=amazon.titan-embed-text-v2:0",
        "ParameterKey=pChunkingStrategy,ParameterValue=Fixed-size chunking",
        "ParameterKey=pMaxTokens,ParameterValue=600",
        "ParameterKey=pOverlapPercentage,ParameterValue=10",
        "ParameterKey=pArtifactsBucket,ParameterValue=$ArtifactsBucket"
    )
    
    Write-Host "   Deploying with parameters..." -ForegroundColor Gray
    $paramsString = $parameters -join " "
    
    if ($stackAction -eq "create-stack") {
        aws cloudformation create-stack `
            --stack-name $Stacks.KB `
            --template-body "file://$kbTemplate" `
            --parameters $paramsString `
            --capabilities CAPABILITY_NAMED_IAM `
            --region $Region | Out-Null
    } else {
        aws cloudformation update-stack `
            --stack-name $Stacks.KB `
            --template-body "file://$kbTemplate" `
            --parameters $paramsString `
            --capabilities CAPABILITY_NAMED_IAM `
            --region $Region 2>&1 | Out-Null
    }
    
    Write-Host "   Waiting for stack deployment..." -ForegroundColor Yellow
    if ($stackAction -eq "create-stack") {
        aws cloudformation wait stack-create-complete --stack-name $Stacks.KB --region $Region
    } else {
        aws cloudformation wait stack-update-complete --stack-name $Stacks.KB --region $Region
    }
    
    # Get Knowledge Base ID from stack outputs
    $kbId = (aws cloudformation describe-stacks --stack-name $Stacks.KB --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='KnowledgeBaseId'].OutputValue" --output text)
    
    if ($kbId) {
        Write-Host "   ✅ Knowledge Base stack deployed. KB ID: $kbId" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Warning: Could not retrieve Knowledge Base ID from stack outputs" -ForegroundColor Yellow
    }
    
    Write-Host ""
} else {
    Write-Host "⏭️  Step 3: Skipping Knowledge Base deployment (--SkipKnowledgeBase specified)" -ForegroundColor Yellow
    Write-Host "   You'll need to provide an existing KB ID for the RAG stack." -ForegroundColor Yellow
    Write-Host ""
    $kbId = Read-Host "   Enter existing Knowledge Base ID (or press Enter to skip)"
}

# =============================================================================
# Step 5: Deploy RAG Solution stack (Lex bot + Lambda)
# =============================================================================
Write-Host "🤖 Step 4: Deploying RAG Solution stack (Lex + Lambda)..." -ForegroundColor Cyan

if (-not $kbId) {
    Write-Host "   ❌ Error: Knowledge Base ID is required" -ForegroundColor Red
    exit 1
}

$ragTemplate = Join-Path $CloudFormationDir "contact-center-RAG-solution.yaml"

if (-not (Test-Path $ragTemplate)) {
    Write-Host "   ❌ Error: CloudFormation template not found: $ragTemplate" -ForegroundColor Red
    exit 1
}

# Get Connect instance ARN if not provided
if (-not $ConnectInstanceArn) {
    Write-Host "   Checking for existing Connect instances..." -ForegroundColor Yellow
    $connectInstances = aws connect list-instances --region $Region --query "InstanceSummaryList[].Id" --output text 2>$null
    if ($connectInstances) {
        $instanceId = ($connectInstances -split '\s+')[0]
        $ConnectInstanceArn = "arn:aws:connect:$Region`:$AccountId`:instance/$instanceId"
        Write-Host "   Found Connect instance: $ConnectInstanceArn" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No Connect instances found. RAG stack will be deployed without Connect integration." -ForegroundColor Yellow
    }
}

# Check if stack already exists
$stackExists = aws cloudformation describe-stacks --stack-name $Stacks.RAG --region $Region 2>$null
if ($stackExists) {
    Write-Host "   Stack already exists. Updating..." -ForegroundColor Yellow
    $stackAction = "update-stack"
} else {
    Write-Host "   Creating new stack..." -ForegroundColor Yellow
    $stackAction = "create-stack"
}

$parameters = @(
    "ParameterKey=pBotName,ParameterValue=handycall-receptionist-$Environment",
    "ParameterKey=pConversationTurns,ParameterValue=4",
    "ParameterKey=pProvisionedConcurrency,ParameterValue=1",
    "ParameterKey=pUseCMK,ParameterValue=no",
    "ParameterKey=pKBID,ParameterValue=$kbId",
    "ParameterKey=pKBS3Bucket,ParameterValue=$KnowledgeBaseBucket",
    "ParameterKey=pArtifactsBucket,ParameterValue=$ArtifactsBucket"
)

if ($ConnectInstanceArn) {
    $parameters += "ParameterKey=pConnectInstanceARN,ParameterValue=$ConnectInstanceArn"
    $parameters += "ParameterKey=pContactFlowName,ParameterValue=handycall-ai-receptionist-$Environment"
}

$paramsString = $parameters -join " "

Write-Host "   Deploying RAG stack..." -ForegroundColor Yellow

if ($stackAction -eq "create-stack") {
    aws cloudformation create-stack `
        --stack-name $Stacks.RAG `
        --template-body "file://$ragTemplate" `
        --parameters $paramsString `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region | Out-Null
} else {
    aws cloudformation update-stack `
        --stack-name $Stacks.RAG `
        --template-body "file://$ragTemplate" `
        --parameters $paramsString `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region 2>&1 | Out-Null
}

Write-Host "   Waiting for stack deployment (this may take 5-10 minutes)..." -ForegroundColor Yellow
if ($stackAction -eq "create-stack") {
    aws cloudformation wait stack-create-complete --stack-name $Stacks.RAG --region $Region
} else {
    aws cloudformation wait stack-update-complete --stack-name $Stacks.RAG --region $Region
}

# Get stack outputs
$botId = (aws cloudformation describe-stacks --stack-name $Stacks.RAG --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='BotId'].OutputValue" --output text)
$botAliasId = (aws cloudformation describe-stacks --stack-name $Stacks.RAG --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='BotAliasId'].OutputValue" --output text)

if ($botId) {
    Write-Host "   ✅ RAG Solution stack deployed successfully" -ForegroundColor Green
    Write-Host "      Bot ID: $botId" -ForegroundColor Gray
    Write-Host "      Bot Alias ID: $botAliasId" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Warning: Could not retrieve Bot ID from stack outputs" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# Summary
# =============================================================================
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Upload knowledge base content to: s3://$KnowledgeBaseBucket" -ForegroundColor White
Write-Host "2. Sync the knowledge base in the Bedrock console" -ForegroundColor White
Write-Host "3. Test the Lex bot in the Lex console" -ForegroundColor White
if ($ConnectInstanceArn) {
    Write-Host "4. Test the contact flow in your Connect instance" -ForegroundColor White
}
Write-Host ""
Write-Host "Stack Names:" -ForegroundColor Yellow
Write-Host "  Knowledge Base: $($Stacks.KB)" -ForegroundColor White
Write-Host "  RAG Solution: $($Stacks.RAG)" -ForegroundColor White
Write-Host ""
if ($botId -and $botAliasId) {
    Write-Host "Bot Details:" -ForegroundColor Yellow
    Write-Host "  Bot ID: $botId" -ForegroundColor White
    Write-Host "  Bot Alias ID: $botAliasId" -ForegroundColor White
    Write-Host ""
}


