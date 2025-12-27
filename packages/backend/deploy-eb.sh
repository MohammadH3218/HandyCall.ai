#!/bin/bash
# Elastic Beanstalk deployment script

set -e

echo "📦 Building shared package..."
cd ../shared
npm install
npm run build
cd ../backend

echo "📦 Installing backend dependencies..."
npm install

echo "🔨 Building backend..."
npm run build

echo "📦 Creating deployment package..."
# Create a zip file excluding unnecessary files
zip -r deploy.zip . -x "node_modules/*" "src/*" "test/*" "*.md" ".env*" ".git/*" ".vscode/*" ".idea/*" "tsconfig.json" "nest-cli.json" "coverage/*"

echo "✅ Deployment package created: deploy.zip"
echo "Now you can deploy using: aws elasticbeanstalk create-application-version ..."

