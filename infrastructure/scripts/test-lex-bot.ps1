# =============================================================================
# Test Lex Bot Script
# =============================================================================
# This script tests the HandyCall Lex bot via AWS CLI
# =============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$BotId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$BotAliasId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$SessionId = "",
    
    [Parameter(Mandatory=$false)]
    [string]$InputText = "Hello"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Test HandyCall Lex Bot" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get bot ID and alias from stack outputs if not provided
if (-not $BotId -or -not $BotAliasId) {
    $StackName = "handycall-voice-ai-$Environment-rag"
    Write-Host "Retrieving bot information from stack: $StackName" -ForegroundColor Yellow
    
    $BotId = (aws cloudformation describe-stacks --stack-name $StackName --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='BotId'].OutputValue" --output text 2>$null)
    
    $BotAliasId = (aws cloudformation describe-stacks --stack-name $StackName --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='BotAliasId'].OutputValue" --output text 2>$null)
    
    if (-not $BotId -or -not $BotAliasId) {
        Write-Host "❌ Error: Could not retrieve Bot ID or Alias ID from stack" -ForegroundColor Red
        Write-Host "   Please provide them manually: -BotId <id> -BotAliasId <id>" -ForegroundColor Yellow
        exit 1
    }
}

# Generate session ID if not provided
if (-not $SessionId) {
    $SessionId = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')"
}

Write-Host "Bot ID: $BotId" -ForegroundColor Green
Write-Host "Bot Alias ID: $BotAliasId" -ForegroundColor Green
Write-Host "Session ID: $SessionId" -ForegroundColor Green
Write-Host "Input Text: $InputText" -ForegroundColor Green
Write-Host ""

# Test the bot
Write-Host "Sending message to bot..." -ForegroundColor Cyan
Write-Host ""

$requestBody = @{
    botId = $BotId
    botAliasId = $BotAliasId
    localeId = "en_US"
    sessionId = $SessionId
    text = $InputText
} | ConvertTo-Json -Compress

$response = aws lexv2-models recognize-text `
    --bot-id $BotId `
    --bot-alias-id $BotAliasId `
    --locale-id "en_US" `
    --session-id $SessionId `
    --text $InputText `
    --region $Region `
    --output json

if ($LASTEXITCODE -eq 0) {
    $responseObj = $response | ConvertFrom-Json
    
    Write-Host "Bot Response:" -ForegroundColor Green
    Write-Host "=============" -ForegroundColor Green
    
    if ($responseObj.messages) {
        foreach ($message in $responseObj.messages) {
            Write-Host $message.content -ForegroundColor White
            Write-Host ""
        }
    }
    
    if ($responseObj.sessionState) {
        $intent = $responseObj.sessionState.intent
        if ($intent) {
            Write-Host "Detected Intent: $($intent.name)" -ForegroundColor Cyan
            if ($intent.state) {
                Write-Host "Intent State: $($intent.state)" -ForegroundColor Gray
            }
        }
        
        $sessionAttributes = $responseObj.sessionState.sessionAttributes
        if ($sessionAttributes) {
            Write-Host ""
            Write-Host "Session Attributes:" -ForegroundColor Cyan
            $sessionAttributes.PSObject.Properties | ForEach-Object {
                Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "✅ Test completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To continue the conversation, run:" -ForegroundColor Yellow
    Write-Host "  .\test-lex-bot.ps1 -SessionId `"$SessionId`" -InputText `"<your message>`"" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Error: Failed to communicate with bot" -ForegroundColor Red
    Write-Host $response -ForegroundColor Red
    exit 1
}

