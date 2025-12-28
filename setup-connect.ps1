# HandyCall Amazon Connect Setup Script
# This script completes the setup that can be done via CLI

Write-Host "🚀 HandyCall Connect Setup Script" -ForegroundColor Cyan
Write-Host ""

$INSTANCE_ID = "e55edc1b-5259-45ce-bb2c-1b3248c6031b"
$PHONE_NUMBER_ID = "91c44d1d-fd3c-4c57-8ea5-c98e146d4b59"
$PHONE_NUMBER = "+16057052030"

# Step 1: Verify company is registered
Write-Host "✅ Step 1: Verifying company registration..." -ForegroundColor Yellow
$company = aws dynamodb get-item `
  --table-name handycall_prod_companies `
  --key '{"company_id":{"S":"test-handycall-001"}}' `
  --output json | ConvertFrom-Json

if ($company.Item) {
    Write-Host "   ✓ Company registered: $($company.Item.company_name.S)" -ForegroundColor Green
} else {
    Write-Host "   ✗ Company not found! Please register it first." -ForegroundColor Red
    exit 1
}

# Step 2: List contact flows to find ours
Write-Host ""
Write-Host "✅ Step 2: Finding contact flow..." -ForegroundColor Yellow
$flows = aws connect list-contact-flows `
  --instance-id $INSTANCE_ID `
  --contact-flow-types CONTACT_FLOW `
  --output json | ConvertFrom-Json

$ourFlow = $flows.ContactFlowSummaryList | Where-Object { $_.Name -like "*HandyCall*" -or $_.Name -like "*handycall*" }

if ($ourFlow) {
    $FLOW_ID = $ourFlow.Id
    $FLOW_ARN = $ourFlow.Arn
    Write-Host "   ✓ Found contact flow: $($ourFlow.Name) (ID: $FLOW_ID)" -ForegroundColor Green
} else {
    Write-Host "   ⚠ Contact flow not found yet." -ForegroundColor Yellow
    Write-Host "   → Please import it via Console (see SETUP_CONNECT_VIA_CONSOLE.md)" -ForegroundColor Cyan
    Write-Host "   → Then run this script again" -ForegroundColor Cyan
    exit 0
}

# Step 3: Associate phone number with contact flow
Write-Host ""
Write-Host "✅ Step 3: Associating phone number with contact flow..." -ForegroundColor Yellow

# Try the update-phone-number command
$targetArn = "arn:aws:connect:us-east-1:982081079378:instance/$INSTANCE_ID/contact-flow/$FLOW_ID"

try {
    aws connect update-phone-number `
      --phone-number-id $PHONE_NUMBER_ID `
      --target-arn $targetArn `
      --output json | Out-Null
    
    Write-Host "   ✓ Phone number associated with contact flow!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Could not associate via CLI. You may need to do this in Console:" -ForegroundColor Yellow
    Write-Host "     1. Go to Channels → Phone numbers" -ForegroundColor Cyan
    Write-Host "     2. Click on $PHONE_NUMBER" -ForegroundColor Cyan
    Write-Host "     3. Select contact flow: $($ourFlow.Name)" -ForegroundColor Cyan
    Write-Host "     4. Click Save" -ForegroundColor Cyan
}

# Step 4: Verify phone number configuration
Write-Host ""
Write-Host "✅ Step 4: Verifying phone number configuration..." -ForegroundColor Yellow
$phoneInfo = aws connect describe-phone-number `
  --phone-number-id $PHONE_NUMBER_ID `
  --instance-id $INSTANCE_ID `
  --output json | ConvertFrom-Json

Write-Host "   Phone Number: $PHONE_NUMBER" -ForegroundColor White
Write-Host "   Phone ID: $PHONE_NUMBER_ID" -ForegroundColor White
Write-Host "   Instance: $INSTANCE_ID" -ForegroundColor White

# Step 5: List knowledge items
Write-Host ""
Write-Host "✅ Step 5: Checking knowledge base..." -ForegroundColor Yellow
$attrValues = '{\":company\":{\"S\":\"test-handycall-001\"}}'
$knowledge = aws dynamodb scan `
  --table-name handycall_prod_knowledge_items `
  --filter-expression "company_id = :company" `
  --expression-attribute-values $attrValues `
  --output json | ConvertFrom-Json

if ($knowledge.Items -and $knowledge.Items.Count -gt 0) {
    Write-Host "   ✓ Found $($knowledge.Items.Count) knowledge items" -ForegroundColor Green
    foreach ($item in $knowledge.Items) {
        Write-Host "     - $($item.title.S)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠ No knowledge items found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📞 Test your setup:" -ForegroundColor Cyan
Write-Host "   Call $PHONE_NUMBER from your phone" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitor logs:" -ForegroundColor Cyan
Write-Host "   aws logs tail /aws/lambda/handycall-call-orchestrator --follow" -ForegroundColor White
Write-Host ""

