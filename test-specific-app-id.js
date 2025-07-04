#!/usr/bin/env node

// Targeted Test for Specific Base44 App ID
// Testing e4e3e4ec3533478cb91d9112dca99f47 with different access patterns

const axios = require('axios');

class SpecificAppTester {
    constructor() {
        this.appId = 'e4e3e4ec3533478cb91d9112dca99f47';
        this.baseUrl = 'https://app.base44.com';
        this.results = [];
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'test' ? '🧪' : '📝';
        console.log(`${emoji} ${message}`);
        this.results.push({ type, message });
    }

    async testSpecificApp() {
        this.log(`🔍 Deep Investigation of App ID: ${this.appId}`, 'test');
        this.log('Testing multiple access patterns and authentication methods...', 'info');

        try {
            // Test 1: Public endpoints (no auth)
            await this.testPublicEndpoints();
            
            // Test 2: Different URL patterns
            await this.testAlternativeURLPatterns();
            
            // Test 3: Auth headers
            await this.testWithAuthHeaders();
            
            // Test 4: App discovery methods
            await this.testAppDiscovery();
            
            // Test 5: Direct app access
            await this.testDirectAppAccess();
            
            this.printAnalysis();
            
        } catch (error) {
            this.log(`💥 Investigation failed: ${error.message}`, 'error');
        }
    }

    async testPublicEndpoints() {
        this.log('Testing public app endpoints...', 'test');
        
        const publicEndpoints = [
            `/api/apps/public/prod/by-id/${this.appId}`,
            `/api/apps/public/login-info/by-id/${this.appId}`,
            `/api/apps/public/prod/domain/${this.appId}`,
            `/api/apps/manifests/${this.appId}/manifest.json`
        ];

        for (const endpoint of publicEndpoints) {
            try {
                this.log(`Trying: ${endpoint}`, 'info');
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    timeout: 5000,
                    validateStatus: () => true // Don't throw on any status
                });
                
                this.log(`Status: ${response.status} - ${response.statusText}`, 'info');
                
                if (response.status === 200) {
                    this.log('SUCCESS! App found via public endpoint', 'success');
                    this.log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'success');
                    return response.data;
                } else if (response.status === 401) {
                    this.log('Authentication required', 'info');
                } else if (response.status === 403) {
                    this.log('Access forbidden - app may be private', 'info');
                } else if (response.status === 404) {
                    this.log('Not found', 'error');
                } else if (response.status === 500) {
                    this.log(`Server error: ${response.data?.message || 'Unknown'}`, 'error');
                }
            } catch (error) {
                this.log(`Request failed: ${error.message}`, 'error');
            }
        }
    }

    async testAlternativeURLPatterns() {
        this.log('Testing alternative URL patterns...', 'test');
        
        const patterns = [
            `/apps/${this.appId}`,
            `/app/${this.appId}`,
            `/${this.appId}`,
            `/api/apps/${this.appId}`,
            `/api/apps/${this.appId}/info`,
            `/api/apps/${this.appId}/public`,
            `/apps/public/${this.appId}`,
            `/public/apps/${this.appId}`
        ];

        for (const pattern of patterns) {
            try {
                this.log(`Trying pattern: ${pattern}`, 'info');
                const response = await axios.get(`${this.baseUrl}${pattern}`, {
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200) {
                    this.log(`SUCCESS via pattern: ${pattern}`, 'success');
                    this.log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'success');
                    return response.data;
                }
            } catch (error) {
                // Silently continue for pattern testing
            }
        }
        
        this.log('No alternative patterns worked', 'error');
    }

    async testWithAuthHeaders() {
        this.log('Testing with authentication headers...', 'test');
        
        const authMethods = [
            { 'Authorization': 'Bearer test-token' },
            { 'X-API-Key': 'test-key' },
            { 'X-Cursor-API-Key': 'test-key' },
            { 'X-Base44-API-Key': 'test-key' },
            { 'Authorization': 'API-Key test-key' }
        ];

        for (const headers of authMethods) {
            try {
                this.log(`Trying auth: ${Object.keys(headers)[0]}`, 'info');
                const response = await axios.get(`${this.baseUrl}/api/apps/public/prod/by-id/${this.appId}`, {
                    headers,
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status !== 500) {
                    this.log(`Different response with auth: ${response.status}`, 'info');
                    if (response.status === 200) {
                        this.log('SUCCESS with authentication!', 'success');
                        return response.data;
                    }
                }
            } catch (error) {
                // Continue testing other auth methods
            }
        }
    }

    async testAppDiscovery() {
        this.log('Testing app discovery methods...', 'test');
        
        try {
            // Test if we can find apps by searching
            const searchEndpoints = [
                '/api/apps',
                '/api/apps/public',
                '/api/apps/search',
                '/api/apps/list'
            ];
            
            for (const endpoint of searchEndpoints) {
                try {
                    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                        timeout: 5000,
                        validateStatus: () => true
                    });
                    
                    if (response.status === 200) {
                        this.log(`App discovery endpoint works: ${endpoint}`, 'success');
                        this.log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
                    }
                } catch (error) {
                    // Continue testing
                }
            }
        } catch (error) {
            this.log(`App discovery failed: ${error.message}`, 'error');
        }
    }

    async testDirectAppAccess() {
        this.log('Testing direct app access...', 'test');
        
        try {
            // Try accessing the app directly as a website
            const response = await axios.get(`${this.baseUrl}/apps/${this.appId}`, {
                timeout: 10000,
                validateStatus: () => true,
                maxRedirects: 5
            });
            
            this.log(`Direct app access status: ${response.status}`, 'info');
            
            if (response.status === 200) {
                // Check if it's an HTML page (app interface)
                const contentType = response.headers['content-type'] || '';
                if (contentType.includes('text/html')) {
                    this.log('App accessible as web application!', 'success');
                    
                    // Look for app metadata in HTML
                    const html = response.data;
                    if (html.includes('PropertyDigital') || html.includes('property')) {
                        this.log('PropertyDigital app confirmed!', 'success');
                    }
                    
                    // Look for Base44 app structure
                    if (html.includes('base44') || html.includes('app-data')) {
                        this.log('Base44 app structure detected', 'success');
                    }
                } else {
                    this.log('Direct access returned data:', 'success');
                    this.log(`Content: ${JSON.stringify(response.data, null, 2)}`, 'info');
                }
            }
        } catch (error) {
            this.log(`Direct app access failed: ${error.message}`, 'error');
        }
    }

    printAnalysis() {
        this.log('\n🔍 ANALYSIS OF APP ID: e4e3e4ec3533478cb91d9112dca99f47', 'info');
        this.log('═══════════════════════════════════════════════════════════', 'info');
        
        const successes = this.results.filter(r => r.type === 'success');
        const errors = this.results.filter(r => r.type === 'error');
        
        this.log(`✅ Successful tests: ${successes.length}`, 'info');
        this.log(`❌ Failed tests: ${errors.length}`, 'info');
        
        if (successes.length > 0) {
            this.log('\n🎉 BREAKTHROUGH FINDINGS:', 'success');
            successes.forEach(s => this.log(`✅ ${s.message}`, 'success'));
        }
        
        this.log('\n💡 POSSIBLE EXPLANATIONS:', 'info');
        this.log('1. App exists but requires authentication', 'info');
        this.log('2. App is private/restricted access only', 'info');
        this.log('3. App ID is correct but API structure is different', 'info');
        this.log('4. App exists but public API endpoints are disabled', 'info');
        this.log('5. App requires specific permissions or user context', 'info');
        
        this.log('\n🔧 RECOMMENDED NEXT STEPS:', 'info');
        this.log('1. Log into Base44 platform with your account', 'info');
        this.log('2. Navigate to PropertyDigital app in dashboard', 'info');
        this.log('3. Look for API settings or integration options', 'info');
        this.log('4. Generate proper API credentials', 'info');
        this.log('5. Test with authenticated requests', 'info');
        
        this.log('\n🎯 CONCLUSION:', 'info');
        if (successes.length > 0) {
            this.log('App ID appears to be valid - authentication needed!', 'success');
        } else {
            this.log('App requires proper authentication or different access method', 'info');
        }
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const tester = new SpecificAppTester();
    
    tester.testSpecificApp()
        .then(() => {
            console.log('\n🎯 Specific app investigation completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Investigation failed:', error.message);
            process.exit(1);
        });
}

module.exports = SpecificAppTester;