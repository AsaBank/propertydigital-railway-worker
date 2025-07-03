#!/usr/bin/env node

// Test Script for Real Base44 API Integration
// This demonstrates the actual AI-to-AI collaboration system

const { Base44PlatformClient, Base44AICollaboration } = require('./base44-platform-client');
const axios = require('axios');

class Base44IntegrationTester {
    constructor() {
        this.serverUrl = 'http://localhost:8080';
        this.base44Client = null;
        this.results = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'test' ? '🧪' : '📝';
        const logMessage = `${emoji} [${timestamp}] ${message}`;
        console.log(logMessage);
        this.results.push({ timestamp, type, message });
    }

    async runFullIntegrationTest() {
        this.log('🚀 Starting Full Base44 Integration Test', 'test');
        this.log('Testing REAL Base44 API collaboration between Cursor AI and Base44 ChatGPT', 'info');
        
        try {
            // Test 1: Check server health
            await this.testServerHealth();
            
            // Test 2: Test Base44 connection
            await this.testBase44Connection();
            
            // Test 3: Get Base44 status
            await this.testBase44Status();
            
            // Test 4: Get Base44 issues (including CSV bug)
            await this.testBase44Issues();
            
            // Test 5: Start CSV upload bug collaboration
            await this.testCSVBugCollaboration();
            
            // Test 6: Direct Base44 API client test
            await this.testDirectBase44Client();
            
            // Test 7: Code analysis with Base44
            await this.testCodeAnalysis();
            
            this.log('🎉 All integration tests completed!', 'success');
            this.printSummary();
            
        } catch (error) {
            this.log(`💥 Integration test failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testServerHealth() {
        this.log('Testing server health...', 'test');
        
        try {
            const response = await axios.get(`${this.serverUrl}/health`);
            
            if (response.data.base44) {
                this.log(`Base44 connection status: ${response.data.base44.connected ? 'Connected' : 'Disconnected'}`, 'info');
                this.log(`Base44 service: ${response.data.base44.service}`, 'info');
            }
            
            this.log('Server health check passed', 'success');
            return response.data;
        } catch (error) {
            this.log(`Server health check failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testBase44Connection() {
        this.log('Testing Base44 platform connection...', 'test');
        
        try {
            const response = await axios.get(`${this.serverUrl}/api/base44/test`);
            this.log(`Base44 connection test: ${response.data.status}`, response.data.status === 'connected' ? 'success' : 'error');
            return response.data;
        } catch (error) {
            this.log(`Base44 connection test failed: ${error.message}`, 'error');
            // Don't throw - might be expected if API key not configured
        }
    }

    async testBase44Status() {
        this.log('Getting Base44 platform status...', 'test');
        
        try {
            const response = await axios.get(`${this.serverUrl}/api/base44/status`);
            this.log('Base44 status retrieved successfully', 'success');
            
            if (response.data.base44Status) {
                this.log(`Base44 platform status: ${JSON.stringify(response.data.base44Status, null, 2)}`, 'info');
            }
            
            return response.data;
        } catch (error) {
            this.log(`Base44 status check failed: ${error.message}`, 'error');
            // Continue with other tests
        }
    }

    async testBase44Issues() {
        this.log('Getting Base44 issues (including CSV upload bug)...', 'test');
        
        try {
            const response = await axios.get(`${this.serverUrl}/api/base44/issues`);
            this.log('Base44 issues retrieved successfully', 'success');
            
            if (response.data.issues && response.data.issues.length > 0) {
                this.log(`Found ${response.data.issues.length} issues:`, 'info');
                response.data.issues.forEach((issue, index) => {
                    this.log(`  ${index + 1}. ${issue.id || 'unknown'}: ${issue.description || issue.title || 'No description'}`, 'info');
                });
                
                // Look for CSV upload bug specifically
                const csvBug = response.data.issues.find(issue => 
                    issue.id === 'csv_upload_button' || 
                    issue.description?.includes('CSV') ||
                    issue.description?.includes('upload')
                );
                
                if (csvBug) {
                    this.log('🐛 Found CSV upload bug issue!', 'success');
                    this.log(`CSV bug details: ${JSON.stringify(csvBug, null, 2)}`, 'info');
                }
            }
            
            return response.data;
        } catch (error) {
            this.log(`Base44 issues check failed: ${error.message}`, 'error');
            // Continue with other tests
        }
    }

    async testCSVBugCollaboration() {
        this.log('🐛 Starting CSV upload bug collaboration with Base44 AI...', 'test');
        
        try {
            const response = await axios.post(`${this.serverUrl}/api/base44/fix-csv-upload`, {});
            
            if (response.data.status === 'csv_bug_collaboration_started') {
                this.log('🤝 CSV bug collaboration started successfully!', 'success');
                this.log(`Session ID: ${response.data.sessionId}`, 'info');
                this.log('Next steps:', 'info');
                response.data.nextSteps?.forEach((step, index) => {
                    this.log(`  ${index + 1}. ${step}`, 'info');
                });
            }
            
            return response.data;
        } catch (error) {
            this.log(`CSV bug collaboration failed: ${error.message}`, 'error');
            // Continue with other tests
        }
    }

    async testDirectBase44Client() {
        this.log('Testing direct Base44 API client...', 'test');
        
        try {
            this.base44Client = new Base44PlatformClient({
                baseUrl: process.env.BASE44_API_URL || 'https://app.base44.com',
                appId: process.env.BASE44_APP_ID || 'e4e3e4ec3533478cb91d9112dca99f47',
                apiKey: process.env.BASE44_API_KEY || 'test-key'
            });

            const connectionResult = await this.base44Client.connect();
            this.log('Direct Base44 client connection attempt completed', 'info');
            this.log(`Connection result: ${JSON.stringify(connectionResult, null, 2)}`, 'info');

            // Test collaboration
            const collaboration = new Base44AICollaboration(this.base44Client);
            const session = await collaboration.startCollaboration({
                type: 'integration_test',
                description: 'Testing AI-to-AI collaboration system'
            });
            
            this.log('Collaboration session created', 'success');
            this.log(`Session details: ${JSON.stringify(session, null, 2)}`, 'info');

            return { connectionResult, session };
        } catch (error) {
            this.log(`Direct Base44 client test failed: ${error.message}`, 'error');
            // Continue with other tests
        }
    }

    async testCodeAnalysis() {
        this.log('Testing code analysis with Base44...', 'test');
        
        const sampleCode = `
// Sample React component with potential CSV upload issue
import React, { useState } from 'react';

const AdvancedDataImporter = () => {
    const [file, setFile] = useState(null);
    
    const handleCSVUpload = (event) => {
        // Potential issue: missing event handling
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
    };
    
    return (
        <div>
            <input 
                type="file" 
                accept=".csv"
                onChange={handleCSVUpload}
            />
            <button onClick={() => {
                // Issue: button not properly connected to upload logic
                console.log('Upload clicked');
            }}>
                Upload CSV
            </button>
        </div>
    );
};`;

        try {
            const response = await axios.post(`${this.serverUrl}/api/base44/analyze`, {
                filePath: 'components/migration/AdvancedDataImporter.jsx',
                code: sampleCode,
                issueDescription: 'CSV upload button not responding'
            });
            
            this.log('Code analysis completed', 'success');
            this.log(`Analysis result: ${JSON.stringify(response.data, null, 2)}`, 'info');
            
            return response.data;
        } catch (error) {
            this.log(`Code analysis failed: ${error.message}`, 'error');
            // Continue with other tests
        }
    }

    printSummary() {
        this.log('\n📊 TEST SUMMARY', 'info');
        this.log('═══════════════════════════════════════', 'info');
        
        const successCount = this.results.filter(r => r.type === 'success').length;
        const errorCount = this.results.filter(r => r.type === 'error').length;
        const testCount = this.results.filter(r => r.type === 'test').length;
        
        this.log(`🧪 Tests run: ${testCount}`, 'info');
        this.log(`✅ Successful: ${successCount}`, 'success');
        this.log(`❌ Failed: ${errorCount}`, errorCount > 0 ? 'error' : 'info');
        
        this.log('\n🚀 INTEGRATION STATUS:', 'info');
        this.log('═══════════════════════════════════════', 'info');
        
        if (errorCount === 0) {
            this.log('🎉 ALL SYSTEMS GO! Base44 integration is working perfectly!', 'success');
        } else if (successCount > errorCount) {
            this.log('⚠️  Partial success - some features working, check configuration', 'info');
        } else {
            this.log('🔧 Integration needs configuration - add your Base44 API key', 'error');
        }
        
        this.log('\n🔧 NEXT STEPS:', 'info');
        this.log('1. Add your Base44 API key to .env file', 'info');
        this.log('2. Visit https://app.base44.com/Base44Integration for documentation', 'info');
        this.log('3. Start collaborating with Base44 AI on the CSV upload bug!', 'info');
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const tester = new Base44IntegrationTester();
    
    tester.runFullIntegrationTest()
        .then(() => {
            console.log('\n🎯 Integration test completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Integration test failed:', error.message);
            process.exit(1);
        });
}

module.exports = Base44IntegrationTester;