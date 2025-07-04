#!/bin/bash

# Quick Setup Script for Base44 PropertyDigital Integration
# Run this after getting your API credentials

echo "🚀 Base44 PropertyDigital Integration Setup"
echo "==========================================="
echo ""

# Check if API key is provided
if [ -z "$BASE44_API_KEY" ]; then
    echo "❌ BASE44_API_KEY not set!"
    echo ""
    echo "Please set your API key first:"
    echo "export BASE44_API_KEY=\"your_api_key_here\""
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Set confirmed app ID
export BASE44_APP_ID="e4e3e4ec3533478cb91d9112dca99f47"

echo "✅ API Key: ${BASE44_API_KEY:0:10}..."
echo "✅ App ID: $BASE44_APP_ID"
echo ""

# Test the integration
echo "🧪 Testing Base44 integration..."
echo "================================"
node test-real-base44-api.js

echo ""
echo "🎯 Testing specific PropertyDigital app..."
echo "=========================================="
node test-specific-app-id.js

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🔧 Available commands:"
echo "  npm start              - Start integration server"
echo "  npm run test-base44    - Test Base44 connection"
echo "  npm run test-api-key   - Test with API key"
echo ""
echo "📱 Your PropertyDigital app:"
echo "  https://app.base44.com/apps/e4e3e4ec3533478cb91d9112dca99f47"
echo ""
echo "📖 Documentation:"
echo "  - FINAL_SUCCESS_SUMMARY.md     - Complete overview"
echo "  - GET_API_ACCESS.md            - API access guide"
echo "  - BASE44_REAL_API_DISCOVERY.md - API documentation"
echo ""
echo "🚀 Ready to automate PropertyDigital with Cursor AI!"