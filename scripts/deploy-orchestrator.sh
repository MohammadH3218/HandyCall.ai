#!/bin/bash

# Deploy Orchestrator Lambda for Lex-First Architecture
# This script builds and deploys the Lambda function

set -e

echo "🚀 Deploying HandyCall Orchestrator Lambda..."
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
LAMBDA_DIR="$PROJECT_ROOT/packages/lambda/call-orchestrator"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Lambda directory: $LAMBDA_DIR"
echo ""

# Step 1: Build
echo "📦 Step 1: Building Lambda function..."
cd "$LAMBDA_DIR"
npm install
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist directory not found"
  exit 1
fi

echo "✅ Build complete"
echo ""

# Step 2: Create zip
echo "📦 Step 2: Creating deployment package..."
rm -f function.zip
zip -r function.zip dist/ node_modules/ package.json

if [ ! -f "function.zip" ]; then
  echo "❌ Failed to create function.zip"
  exit 1
fi

echo "✅ Package created: function.zip ($(du -h function.zip | cut -f1))"
echo ""

# Step 3: Update Lambda
echo "📦 Step 3: Updating Lambda function code..."
aws lambda update-function-code \
  --function-name handycall-call-orchestrator \
  --zip-file fileb://function.zip \
  --region us-east-1

if [ $? -ne 0 ]; then
  echo "❌ Failed to update Lambda function"
  exit 1
fi

echo "✅ Lambda function updated"
echo ""

# Step 4: Grant Lex permission (if not already granted)
echo "📦 Step 4: Ensuring Lex has permission to invoke Lambda..."
BOT_ALIAS_ARN="arn:aws:lex:us-east-1:982081079378:bot-alias/MB9C3YAJSG/EU1XLNNWLC"

aws lambda add-permission \
  --function-name handycall-call-orchestrator \
  --statement-id LexInvoke-$(date +%s) \
  --action lambda:InvokeFunction \
  --principal lex.amazonaws.com \
  --source-arn "$BOT_ALIAS_ARN" \
  2>/dev/null || echo "⚠️  Permission may already exist (this is okay)"

echo "✅ Permissions configured"
echo ""

# Step 5: Wait for update to complete
echo "⏳ Step 5: Waiting for Lambda update to complete..."
aws lambda wait function-updated \
  --function-name handycall-call-orchestrator \
  --region us-east-1

echo "✅ Lambda update complete"
echo ""

echo "=" .repeat(70)
echo "✅ DEPLOYMENT COMPLETE!"
echo "=" .repeat(70)
echo ""
echo "📋 Next Steps:"
echo "   1. Configure Lex FallbackIntent to use Lambda fulfillment"
echo "   2. Import the new Contact Flow: handycall-lex-first-flow.json"
echo "   3. Test the call flow"
echo ""


