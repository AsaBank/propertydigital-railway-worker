#!/bin/bash

# Quick Test Script for Base44 Integration
# Run this to test the AI-to-AI collaboration system

echo "🚀 Testing Cursor AI ↔ Base44 ChatGPT Integration"
echo "================================================="

# Check if server is running
echo ""
echo "📡 Testing server health..."
curl -s http://localhost:8080/health | jq '.' || echo "❌ Server not running. Start with: npm start"

echo ""
echo "🔗 Testing Base44 connection..."
curl -s http://localhost:8080/api/base44/test | jq '.' || echo "⚠️  Connection test failed (expected if API key not set)"

echo ""
echo "📊 Getting Base44 platform status..."
curl -s http://localhost:8080/api/base44/status | jq '.' || echo "⚠️  Status check failed (expected if API key not set)"

echo ""
echo "🐛 Getting Base44 issues (including CSV upload bug)..."
curl -s http://localhost:8080/api/base44/issues | jq '.' || echo "⚠️  Issues check failed (expected if API key not set)"

echo ""
echo "🚀 SPECIAL TEST: Starting CSV Upload Bug Collaboration..."
echo "This will initiate AI-to-AI collaboration on the specific bug!"
curl -s -X POST http://localhost:8080/api/base44/fix-csv-upload | jq '.' || echo "⚠️  CSV collaboration failed (expected if API key not set)"

echo ""
echo "📋 Available endpoints:"
curl -s http://localhost:8080/api/nonexistent 2>/dev/null | jq '.available_endpoints[]' || echo "Server endpoints available"

echo ""
echo "🎯 Test completed!"
echo ""
echo "🔧 To enable full functionality:"
echo "1. Add BASE44_API_KEY to your .env file"
echo "2. Visit https://app.base44.com/Base44Integration for API key"
echo "3. Re-run this test to see real AI collaboration!"
echo ""
echo "🤖 Ready for groundbreaking AI-to-AI collaboration!"