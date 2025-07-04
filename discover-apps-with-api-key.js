#!/usr/bin/env node

// Discover Apps Available with This API Key
// Test different authentication patterns and app discovery methods

const axios = require('axios');

class AppDiscoveryTester {
    constructor() {
        this.apiKey = 'base44_sk_live_fnl5wjb3ax6jg68i5lrtgm2glrkir716';
        this.baseUrl = 'https://app.base44.com';
        this.results = [];
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'test' ? '🧪' : '📝';
        console.log(`${emoji} ${message}`);
        this.results.push({ type, message });
    }

    async discoverApps() {
        this.log('🔍 DISCOVERING APPS WITH THIS API KEY', 'test');
        this.log(`🔑 API Key: ${this.apiKey.substring(0, 20)}...`, 'info');
        this.log('', 'info');

        try {
            // Test 1: App Discovery Endpoints
            await this.testAppDiscoveryEndpoints();
            
            // Test 2: User/Account Information
            await this.testUserAccountInfo();
            
            // Test 3: Alternative Authentication Headers
            await this.testAlternativeAuthHeaders();
            
            // Test 4: Different App ID Formats
            await this.testDifferentAppIDFormats();
            
            // Test 5: Platform-level endpoints
            await this.testPlatformEndpoints();
            
            this.printDiscoveryResults();
            
        } catch (error) {
            this.log(`💥 Discovery failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testAppDiscoveryEndpoints() {
        this.log('Testing app discovery endpoints...', 'test');
        
        const discoveryEndpoints = [
            '/api/apps',
            '/api/apps/list',
            '/api/apps/owned',
            '/api/apps/accessible',
            '/api/user/apps',
            '/api/account/apps',
            '/api/workspace/apps',
            '/api/my/apps'
        ];

        for (const endpoint of discoveryEndpoints) {
            try {
                this.log(`Trying: ${endpoint}`, 'info');
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                this.log(`Status: ${response.status}`, 'info');
                
                if (response.status === 200) {
                    this.log(`SUCCESS! Found app discovery endpoint: ${endpoint}`, 'success');
                    this.log(`Response:`, 'success');
                    console.log(JSON.stringify(response.data, null, 2));
                    
                    // If we get apps data, extract app IDs
                    if (Array.isArray(response.data)) {
                        this.log(`Found ${response.data.length} apps!`, 'success');
                        response.data.forEach((app, index) => {
                            if (app.id) {
                                this.log(`App ${index + 1}: ID=${app.id}, Name=${app.name || 'Unknown'}`, 'success');
                            }
                        });
                    }
                } else if (response.status === 401) {
                    this.log('Authentication required for this endpoint', 'info');
                } else if (response.status === 403) {
                    this.log('Access forbidden', 'info');
                } else {
                    this.log(`Endpoint returned: ${response.status} ${response.statusText}`, 'info');
                }
            } catch (error) {
                this.log(`Request failed: ${error.message}`, 'error');
            }
        }
    }

    async testUserAccountInfo() {
        this.log('Testing user/account information endpoints...', 'test');
        
        const userEndpoints = [
            '/api/user',
            '/api/user/profile',
            '/api/account',
            '/api/me',
            '/api/user/info',
            '/api/auth/user'
        ];

        for (const endpoint of userEndpoints) {
            try {
                this.log(`Trying user endpoint: ${endpoint}`, 'info');
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey
                    },
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200) {
                    this.log(`SUCCESS! User info from: ${endpoint}`, 'success');
                    this.log(`User data:`, 'success');
                    console.log(JSON.stringify(response.data, null, 2));
                } else {
                    this.log(`User endpoint ${endpoint}: ${response.status}`, 'info');
                }
            } catch (error) {
                // Continue silently
            }
        }
    }

    async testAlternativeAuthHeaders() {
        this.log('Testing alternative authentication methods...', 'test');
        
        const authMethods = [
            { 'Authorization': `Bearer ${this.apiKey}` },
            { 'Authorization': `API-Key ${this.apiKey}` },
            { 'X-API-Key': this.apiKey },
            { 'X-Base44-API-Key': this.apiKey },
            { 'X-Cursor-API-Key': this.apiKey },
            { 'Authorization': `Token ${this.apiKey}` }
        ];

        // Test with a known endpoint that should work
        for (const headers of authMethods) {
            try {
                const authType = Object.keys(headers)[0];
                this.log(`Testing auth method: ${authType}`, 'info');
                
                const response = await axios.get(`${this.baseUrl}/api/apps/public/prod/by-id/e4e3e4ec3533478cb91d9112dca99f47`, {
                    headers,
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status !== 500) {
                    this.log(`Different response with ${authType}: ${response.status}`, 'success');
                    if (response.status === 200) {
                        this.log(`SUCCESS with ${authType}!`, 'success');
                        console.log(JSON.stringify(response.data, null, 2));
                    }
                }
            } catch (error) {
                // Continue testing
            }
        }
    }

    async testDifferentAppIDFormats() {
        this.log('Testing different app ID formats...', 'test');
        
        const originalId = 'e4e3e4ec3533478cb91d9112dca99f47';
        const idVariations = [
            originalId.toUpperCase(),
            originalId.toLowerCase(),
            originalId.replace(/-/g, ''),
            `app_${originalId}`,
            `base44_${originalId}`
        ];

        for (const appId of idVariations) {
            try {
                this.log(`Testing app ID variation: ${appId}`, 'info');
                
                const response = await axios.get(`${this.baseUrl}/api/apps/public/prod/by-id/${appId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey
                    },
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200) {
                    this.log(`SUCCESS! Working app ID format: ${appId}`, 'success');
                    console.log(JSON.stringify(response.data, null, 2));
                    break;
                } else if (response.status !== 500) {
                    this.log(`App ID ${appId}: Different response ${response.status}`, 'info');
                }
            } catch (error) {
                // Continue testing
            }
        }
    }

    async testPlatformEndpoints() {
        this.log('Testing platform-level endpoints...', 'test');
        
        const platformEndpoints = [
            '/api/usage-logs/current-usage',
            '/api/billing',
            '/api/workspace',
            '/api/integrations',
            '/api/files',
            '/api/support'
        ];

        for (const endpoint of platformEndpoints) {
            try {
                this.log(`Testing platform endpoint: ${endpoint}`, 'info');
                
                const response = await axios.get(`${this.baseUrl}${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-API-Key': this.apiKey
                    },
                    timeout: 5000,
                    validateStatus: () => true
                });
                
                if (response.status === 200) {
                    this.log(`SUCCESS! Platform endpoint working: ${endpoint}`, 'success');
                    this.log(`Data:`, 'info');
                    console.log(JSON.stringify(response.data, null, 2));
                } else if (response.status === 401) {
                    this.log(`${endpoint}: Authentication required`, 'info');
                } else if (response.status === 403) {
                    this.log(`${endpoint}: Access forbidden`, 'info');
                } else {
                    this.log(`${endpoint}: ${response.status} ${response.statusText}`, 'info');
                }
            } catch (error) {
                // Continue testing
            }
        }
    }

    printDiscoveryResults() {
        this.log('\n🔍 APP DISCOVERY RESULTS', 'info');
        this.log('═══════════════════════════════════════', 'info');
        
        const successes = this.results.filter(r => r.type === 'success');
        const errors = this.results.filter(r => r.type === 'error');
        
        this.log(`✅ Successful discoveries: ${successes.length}`, 'info');
        this.log(`❌ Failed attempts: ${errors.length}`, 'info');
        
        if (successes.length > 0) {
            this.log('\n🎉 DISCOVERIES:', 'success');
            successes.forEach(s => {
                if (s.message.includes('SUCCESS!') || s.message.includes('Found')) {
                    this.log(`✅ ${s.message}`, 'success');
                }
            });
        }
        
        this.log('\n💡 CONCLUSIONS:', 'info');
        
        if (successes.some(s => s.message.includes('app discovery'))) {
            this.log('✅ Found way to discover accessible apps!', 'success');
        } else {
            this.log('❌ Could not find app discovery endpoints', 'error');
        }
        
        if (successes.some(s => s.message.includes('User info'))) {
            this.log('✅ API key has user/account access!', 'success');
        } else {
            this.log('❌ No user info access with this API key', 'error');
        }
        
        this.log('\n🎯 RECOMMENDATIONS:', 'info');
        
        if (successes.length === 0) {
            this.log('1. The API key might be for a different Base44 instance', 'info');
            this.log('2. The API key might have limited permissions', 'info');
            this.log('3. Additional authentication steps might be required', 'info');
            this.log('4. Contact Base44 support to verify API key scope', 'info');
        } else {
            this.log('1. Use discovered endpoints to find correct app IDs', 'info');
            this.log('2. Verify which apps this API key can access', 'info');
            this.log('3. Update integration with correct app ID', 'info');
        }
        
        this.log('\n📞 NEXT ACTIONS:', 'info');
        this.log('1. Check Base44 dashboard for API key permissions', 'info');
        this.log('2. Verify the app ID in your Base44 account', 'info');
        this.log('3. Look for app-specific API configuration', 'info');
        this.log('4. Contact Base44 support if needed', 'info');
    }
}

// Run the discovery
if (require.main === module) {
    const tester = new AppDiscoveryTester();
    
    tester.discoverApps()
        .then(() => {
            console.log('\n🎯 App discovery completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Discovery failed:', error.message);
            process.exit(1);
        });
}

module.exports = AppDiscoveryTester;