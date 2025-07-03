#!/usr/bin/env node

// Quick Test Script for Base44 API Key
// Run this when you get your real Base44 API key!

const { Base44PlatformClient } = require('./base44-platform-client');
require('dotenv').config();

async function testWithRealAPIKey() {
    console.log('🔑 Testing Base44 with REAL API Key...\n');
    
    // Check if API key is configured
    if (!process.env.BASE44_API_KEY || process.env.BASE44_API_KEY === 'test-key') {
        console.log('❌ No real API key found!');
        console.log('Please add your Base44 API key to .env file:');
        console.log('BASE44_API_KEY=your_real_api_key_here\n');
        console.log('Visit https://app.base44.com/CursorAIBridge to get your API key!');
        process.exit(1);
    }
    
    const client = new Base44PlatformClient({
        baseUrl: process.env.BASE44_API_URL || 'https://app.base44.com',
        appId: process.env.BASE44_APP_ID || 'e4e3e4ec3533478cb91d9112dca99f47',
        apiKey: process.env.BASE44_API_KEY
    });

    try {
        console.log('🚀 Step 1: Testing Base44 Connection...');
        const connection = await client.connect();
        console.log('✅ Connection successful!', connection);
        
        console.log('\n📊 Step 2: Getting Enhanced System Status...');
        const status = await client.getSystemStatus();
        console.log('✅ Enhanced status:', status);
        
        console.log('\n🏗️ Step 3: Getting System Structure...');
        const structure = await client.getSystemStructure();
        console.log('✅ System structure:', structure);
        
        console.log('\n🔍 Step 4: Testing Enhanced Analysis...');
        const analysis = await client.analyzeWithBase44Enhanced({
            filePath: 'components/migration/AdvancedDataImporter.jsx',
            issueDescription: 'CSV upload button not responding',
            codeSnippet: 'button onClick={() => { console.log("Upload clicked"); }}',
            analysisType: 'bug_analysis'
        });
        console.log('✅ Enhanced analysis:', analysis);
        
        console.log('\n🎉 ALL TESTS PASSED! Base44 AI collaboration is LIVE!');
        console.log('\n🚀 Ready to start AI-to-AI collaboration on:');
        console.log('   • CSV upload bug fix');
        console.log('   • Real-time code analysis');
        console.log('   • PropertyDigital improvements');
        console.log('\n🌟 The future of AI development is here!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your API key is correct');
        console.log('2. Visit https://app.base44.com/CursorAIBridge for support');
        console.log('3. Ensure your Base44 account has API access');
    }
}

// Run the test
testWithRealAPIKey();